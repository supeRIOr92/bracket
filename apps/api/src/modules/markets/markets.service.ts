import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { ethers } from 'ethers';

@Injectable()
export class MarketsService {
  private readonly logger = new Logger(MarketsService.name);
  constructor(
    private supabase: SupabaseService,
    private config: ConfigService,
  ) {}

  /**
   * Ambil semua market aktif (status = open atau closed).
   */
  async getActiveMarkets() {
    const db = this.supabase.getClient();

    const { data, error } = await db
      .from('market_pool_distribution')
      .select('*')
      .in('status', ['open', 'closed'])
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Ambil detail market by ID.
   */
  async getMarketById(id: string) {
    const db = this.supabase.getClient();

    const { data, error } = await db
      .from('market_pool_distribution')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Market not found');
    return data;
  }

  /**
   * Ambil market aktif hari ini.
   */
  async getTodayMarket() {
    const db = this.supabase.getClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await db
      .from('market_pool_distribution')
      .select('*')
      .eq('date', today)
      .single();

    if (error || !data) throw new NotFoundException('No market for today');
    return data;
  }

  /**
   * Pool distribution realtime untuk market tertentu.
   * Menghitung estimated payout per pool.
   */
  async getPoolDistribution(marketId: string) {
    const db = this.supabase.getClient();

    const { data: market, error } = await db
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (error || !market) throw new NotFoundException('Market not found');

    const totalStake = parseFloat(market.total_stake) || 0;
    const feeRate = 0.05; // 5%

    const pools = [
      { id: 1, label: 'A', range: `< $${market.pool_a_upper}`, stake: parseFloat(market.pool_a_stake) || 0 },
      { id: 2, label: 'B', range: `$${market.pool_a_upper} – $${market.pool_b_upper}`, stake: parseFloat(market.pool_b_stake) || 0 },
      { id: 3, label: 'C', range: `$${market.pool_b_upper} – $${market.pool_c_upper}`, stake: parseFloat(market.pool_c_stake) || 0 },
      { id: 4, label: 'D', range: `$${market.pool_c_upper} – $${market.pool_d_upper}`, stake: parseFloat(market.pool_d_stake) || 0 },
      { id: 5, label: 'E', range: `≥ $${market.pool_d_upper}`, stake: parseFloat(market.pool_e_stake) || 0 },
    ];

    return pools.map((pool) => {
      const participationPct = totalStake > 0
        ? ((pool.stake / totalStake) * 100).toFixed(2)
        : '0.00';

      // Estimated payout kalau bet 1 USDC sekarang
      const hypotheticalTotal = totalStake + 1;
      const hypotheticalPoolStake = pool.stake + 1;
      const netPool = hypotheticalTotal * (1 - feeRate);
      const estimatedMultiplier = hypotheticalPoolStake > 0
        ? (netPool / hypotheticalPoolStake).toFixed(2)
        : '0.00';

      return {
        ...pool,
        participationPct,
        estimatedMultiplier,
        isWinner: market.winning_pool === pool.id,
      };
    });
  }

    /**
   * Ambil pemenang dari market kemarin.
   */
  async getYesterdayWinners(limit = 10) {
    const db = this.supabase.getClient();

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const { data: market } = await db
      .from('markets')
      .select('id, winning_pool, settlement_price, pool_a_upper, pool_b_upper, pool_c_upper, pool_d_upper')
      .eq('date', dateStr)
      .eq('status', 'settled')
      .single();

    if (!market) return { market: null, winners: [] };

    const { data: winners } = await db
      .from('predictions')
      .select(`
        id,
        pool_id,
        stake_amount,
        payout_amount,
        users(id, username, wallet_address)
      `)
      .eq('market_id', market.id)
      .eq('is_winner', true)
      .order('payout_amount', { ascending: false })
      .limit(limit);

    return {
      market: {
        date: dateStr,
        winning_pool: market.winning_pool,
        settlement_price: market.settlement_price,
      },
      winners: winners || [],
    };
  }

  /**
   * Cron sync pool stakes setiap 5 menit.
    */
    @Cron('*/5 * * * *', { timeZone: 'UTC' })
    async syncAllActiveMarkets() {
    const contractAddress = this.config.get<string>('blockchain.contractAddress');
    if (
    !contractAddress ||
    contractAddress === '0x0000000000000000000000000000000000000000'
    ) return;

    const db = this.supabase.getClient();
    const { data: markets } = await db
    .from('markets')
    .select('id, chain_market_id')
    .eq('status', 'open')
    .not('chain_market_id', 'is', null);

    if (!markets?.length) return;

    for (const market of markets) {
    await this.syncPoolStakes(market.id, market.chain_market_id);
    }
    }

    /**
    * Sync pool stakes dari blockchain ke database.
    * Dipanggil oleh event listener atau cron job.
    */
    async syncPoolStakes(marketId: string, chainMarketId: number) {

    try {
      const provider = new ethers.JsonRpcProvider(
        this.config.get('blockchain.rpcUrl'),
      );

      const contractAbi = [
        'function getPoolDistribution(uint256 marketId) external view returns (uint256[5] memory poolStakes, uint256 totalStake)',
      ];

      const contract = new ethers.Contract(
        this.config.get<string>('blockchain.contractAddress')!,
        contractAbi,
        provider,
      );

      const [poolStakes, totalStake] = await contract.getPoolDistribution(chainMarketId);

      const db = this.supabase.getClient();
      await db
        .from('markets')
        .update({
          pool_a_stake: ethers.formatUnits(poolStakes[0], 6),
          pool_b_stake: ethers.formatUnits(poolStakes[1], 6),
          pool_c_stake: ethers.formatUnits(poolStakes[2], 6),
          pool_d_stake: ethers.formatUnits(poolStakes[3], 6),
          pool_e_stake: ethers.formatUnits(poolStakes[4], 6),
          total_stake: ethers.formatUnits(totalStake, 6),
        })
        .eq('id', marketId);
    } catch (err) {
            console.error('Failed to sync pool stakes:', err);
    }
  }

  // ─── Volatile Range Engine ────────────────────────────────────────────────

  private async fetchBinanceKlines(interval: string, limit: number): Promise<number[]> {
    const days = limit <= 7 ? 7 : limit <= 30 ? 30 : 90;
    const apiKey = this.config.get<string>('coingecko.apiKey');
    const headers: Record<string, string> = apiKey ? { 'x-cg-demo-api-key': apiKey } : {};
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=${days}`, { headers });
    if (!res.ok) throw new Error(`CoinGecko OHLC error: ${res.status}`);
    const data: any[] = await res.json();
    return data.slice(-limit).map((c) => c[4]);
  }

  async fetchCurrentBtcPrice(): Promise<number> {
    const apiKey = this.config.get<string>('coingecko.apiKey');
    const headers: Record<string, string> = apiKey ? { 'x-cg-demo-api-key': apiKey } : {};
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', { headers });
    if (!res.ok) throw new Error('Failed to fetch BTC price');
    const data: any = await res.json();
    return data.bitcoin.usd;
  }

  private calcRealizedVol(closes: number[]): number {
    if (closes.length < 2) return 0.03;
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
    return Math.sqrt(variance) * Math.sqrt(365);
  }

  private async calcAtrPct(btcPrice: number): Promise<number> {
    try {
    const apiKey = this.config.get<string>('coingecko.apiKey');
    const headers: Record<string, string> = apiKey ? { 'x-cg-demo-api-key': apiKey } : {};
    const res = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=2', { headers });
     if (!res.ok) return 0.015;
      const data: any[] = await res.json();
        if (data.length < 2) return 0.015;
        let atrSum = 0;
        for (let i = 1; i < data.length; i++) {
        const high = data[i][2];
        const low = data[i][3];
        const prevClose = data[i - 1][4];
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        atrSum += tr;
        }
        const price = btcPrice || data[data.length - 1][4];
        return (atrSum / (data.length - 1)) / price;
      } catch {
      return 0.015;
    }
  }

  async calcExpectedMovePct(): Promise<{ movePct: number; btcPrice: number }> {
    const btcPrice = await this.fetchCurrentBtcPrice();
    const [closes7d, closes30d, atr] = await Promise.all([
      this.fetchBinanceKlines('1d', 8).then((c) => c.slice(0, 7)),
      this.fetchBinanceKlines('1d', 31).then((c) => c.slice(0, 30)),
      this.calcAtrPct(btcPrice),
    ]);

    const vol7d = this.calcRealizedVol(closes7d) / Math.sqrt(365);
    const vol30d = this.calcRealizedVol(closes30d) / Math.sqrt(365);
    const raw = 0.4 * vol7d + 0.3 * vol30d + 0.3 * atr;
    const movePct = Math.min(0.05, Math.max(0.005, raw));

    this.logger.log(`vol7d=${(vol7d*100).toFixed(2)}% vol30d=${(vol30d*100).toFixed(2)}% atr=${(atr*100).toFixed(2)}% → move=${(movePct*100).toFixed(2)}%`);
    return { movePct, btcPrice };
  }

  generatePoolBoundaries(btcPrice: number, movePct: number) {
    const step = btcPrice * movePct;
    const round = (n: number) => Math.round(n / 50) * 50;
    return {
      poolAUpper: round(btcPrice - 1.5 * step),
      poolBUpper: round(btcPrice - 0.5 * step),
      poolCUpper: round(btcPrice + 0.5 * step),
      poolDUpper: round(btcPrice + 1.5 * step),
    };
  }

  async createDailyMarket() {
    this.logger.log('Creating daily market...');
    try {
      const { movePct, btcPrice } = await this.calcExpectedMovePct();
      const bounds = this.generatePoolBoundaries(btcPrice, movePct);
      const today = new Date().toISOString().split('T')[0];

      const db = this.supabase.getClient();
      const { data: existing } = await db.from('markets').select('id').eq('date', today).single();
      if (existing) {
        this.logger.log(`Market for ${today} already exists, skipping.`);
        return;
      }

      const { data, error } = await db.from('markets').insert({
        asset: 'BTC',
        date: today,
        status: 'open',
        open_at: new Date(`${today}T00:00:00Z`).toISOString(),
        close_at: new Date(`${today}T23:00:00Z`).toISOString(),
        settle_at: new Date(`${today}T23:59:00Z`).toISOString(),
        btc_price_at_open: btcPrice,
        expected_move_pct: movePct * 100,
        pool_a_upper: bounds.poolAUpper,
        pool_b_upper: bounds.poolBUpper,
        pool_c_upper: bounds.poolCUpper,
        pool_d_upper: bounds.poolDUpper,
      }).select().single();

      if (error) throw new Error(error.message);
      this.logger.log(`Daily market created: ${data.id} | BTC=$${btcPrice} | move=${(movePct*100).toFixed(2)}%`);

      // ── Register ke smart contract ────────────────────────────────────────
      const contractAddress = this.config.get<string>('blockchain.contractAddress');
      const privateKey = this.config.get<string>('blockchain.deployerPrivateKey');

      if (contractAddress && privateKey) {
        try {
          const provider = new ethers.JsonRpcProvider(
            this.config.get<string>('blockchain.rpcUrl') || 'https://mainnet.base.org',
          );
          const wallet = new ethers.Wallet(privateKey, provider);
          const contract = new ethers.Contract(
            contractAddress,
            [
              'function createMarket(uint256 openAt, uint256 closeAt, uint256 settleAt, int256[4] calldata bounds) external returns (uint256)',
              'event MarketCreated(uint256 indexed marketId, uint256 openAt, uint256 closeAt, uint256 settleAt, int256[4] bounds)',
            ],
            wallet,
          );

          const openAt   = Math.floor(new Date(`${today}T00:00:00Z`).getTime() / 1000);
          const closeAt  = Math.floor(new Date(`${today}T23:00:00Z`).getTime() / 1000);
          const settleAt = Math.floor(new Date(`${today}T23:59:00Z`).getTime() / 1000);
          const chainBounds: [bigint, bigint, bigint, bigint] = [
            BigInt(Math.round(bounds.poolAUpper * 1e8)),
            BigInt(Math.round(bounds.poolBUpper * 1e8)),
            BigInt(Math.round(bounds.poolCUpper * 1e8)),
            BigInt(Math.round(bounds.poolDUpper * 1e8)),
          ];

          const tx = await contract.createMarket(openAt, closeAt, settleAt, chainBounds);
          const receipt = await tx.wait();

          const iface = new ethers.Interface([
            'event MarketCreated(uint256 indexed marketId, uint256 openAt, uint256 closeAt, uint256 settleAt, int256[4] bounds)',
          ]);
          let chainMarketId: number | null = null;
          for (const log of receipt.logs) {
            try {
              const parsed = iface.parseLog(log);
              if (parsed?.name === 'MarketCreated') {
                chainMarketId = Number(parsed.args.marketId);
              }
            } catch {}
          }

          if (chainMarketId !== null) {
            await db.from('markets').update({ chain_market_id: chainMarketId }).eq('id', data.id);
            this.logger.log(`Market registered onchain: chain_market_id=${chainMarketId}`);
          }
        } catch (chainErr) {
          this.logger.error('Failed to register market onchain (DB market still created):', chainErr);
        }
      } else {
        this.logger.warn('CONTRACT_ADDRESS or DEPLOYER_PRIVATE_KEY not set — skipping onchain registration');
      }

    } catch (err) {
      this.logger.error('Failed to create daily market:', err);
    }
  }

  async createTodayMarketManual() {
    return this.createDailyMarket();
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { ethers } from 'ethers';
import { XpService } from '../xp/xp.service';

const PREDICTION_MARKET_ABI = [
  'function settleMarket(uint256 marketId) external',
  'function createMarket(uint256 openAt, uint256 closeAt, uint256 settleAt, int256[4] calldata bounds) external returns (uint256)',
  'event MarketSettled(uint256 indexed marketId, uint8 winningPool, int256 settlementPrice, uint256 totalStake, uint256 winningPoolStake, bool isRefund)',
  'event MarketCreated(uint256 indexed marketId, uint256 openAt, uint256 closeAt, uint256 settleAt, int256[4] bounds)',
];

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);
  private provider: ethers.JsonRpcProvider;
  private wallet!: ethers.Wallet;
  private contract!: ethers.Contract;

  constructor(
    private config: ConfigService,
    private supabase: SupabaseService,
    private xp: XpService,
  ) {
    this.provider = new ethers.JsonRpcProvider(
      this.config.get('blockchain.rpcUrl'),
    );

    const pk = this.config.get('blockchain.deployerPrivateKey');
    if (pk) {
      this.wallet = new ethers.Wallet(pk, this.provider);
      this.contract = new ethers.Contract(
        this.config.get<string>('blockchain.contractAddress')!,
        PREDICTION_MARKET_ABI,
        this.wallet,
      );
    }
  }

  /**
   * Auto-settle cron: jalan setiap hari jam 00:01 UTC.
   * Cari semua market yang sudah lewat settleAt tapi belum settled.
   */
  @Cron('1 0 * * *', { timeZone: 'UTC' })
  async autoSettle() {
    this.logger.log('Running auto-settle cron...');

    const db = this.supabase.getClient();
    const now = new Date().toISOString();

    // Cari market yang perlu di-settle
    const { data: markets } = await db
      .from('markets')
      .select('*')
      .eq('status', 'closed')
      .lte('settle_at', now)
      .not('chain_market_id', 'is', null);

    if (!markets?.length) {
      this.logger.log('No markets to settle');
      return;
    }

    for (const market of markets) {
      await this.settleMarket(market);
    }
  }

  /**
   * Auto-create market: jalan setiap hari jam 00:00 UTC.
   * Generate range berdasarkan volatilitas BTC dan buat market baru.
   */

  async autoCreateMarket() {
    this.logger.log('Running auto-create market cron...');

    try {
      const bounds = await this.generateRangeBounds();
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // Timestamps dalam Unix seconds
      const openAt = Math.floor(new Date(`${todayStr}T00:00:00Z`).getTime() / 1000);
      const closeAt = Math.floor(new Date(`${todayStr}T23:00:00Z`).getTime() / 1000);
      const settleAt = Math.floor(new Date(`${todayStr}T23:59:59Z`).getTime() / 1000) + 1;

      // Kirim tx ke blockchain
      const tx = await this.contract.createMarket(openAt, closeAt, settleAt, bounds);
      const receipt = await tx.wait();

      // Parse event untuk dapat marketId
      const iface = new ethers.Interface(PREDICTION_MARKET_ABI);
      let chainMarketId: number | null = null;

      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === 'MarketCreated') {
            chainMarketId = Number(parsed.args.marketId);
          }
        } catch {}
      }

      // Simpan ke database
      const db = this.supabase.getClient();
      await db.from('markets').insert({
        chain_market_id: chainMarketId,
        asset: 'BTC',
        date: todayStr,
        status: 'open',
        open_at: new Date(openAt * 1000).toISOString(),
        close_at: new Date(closeAt * 1000).toISOString(),
        settle_at: new Date(settleAt * 1000).toISOString(),
        pool_a_upper: ethers.formatUnits(bounds[0], 8),
        pool_b_upper: ethers.formatUnits(bounds[1], 8),
        pool_c_upper: ethers.formatUnits(bounds[2], 8),
        pool_d_upper: ethers.formatUnits(bounds[3], 8),
        btc_price_at_open: ethers.formatUnits(bounds[1], 8), // approx
      });

      this.logger.log(`Market created for ${todayStr}, chainId: ${chainMarketId}`);
    } catch (err) {
      this.logger.error('Failed to create market:', err);
    }
  }

  /**
   * Auto-close betting: jalan setiap hari jam 23:00 UTC.
   */
  @Cron('0 23 * * *', { timeZone: 'UTC' })
  async autoCloseBetting() {
    const db = this.supabase.getClient();
    const todayStr = new Date().toISOString().split('T')[0];

    await db
      .from('markets')
      .update({ status: 'closed' })
      .eq('date', todayStr)
      .eq('status', 'open');

    this.logger.log(`Betting closed for ${todayStr}`);
  }

  /**
   * Settle satu market — kirim tx ke blockchain, update database.
   */
  async settleMarket(market: any) {
    try {
      this.logger.log(`Settling market ${market.id} (chain: ${market.chain_market_id})`);

      const tx = await this.contract.settleMarket(market.chain_market_id);
      const receipt = await tx.wait();

      // Parse MarketSettled event
      const iface = new ethers.Interface(PREDICTION_MARKET_ABI);
      let winningPool: number | null = null;
      let settlementPrice: string | null = null;
      let isRefund = false;

      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === 'MarketSettled') {
            winningPool = Number(parsed.args.winningPool);
            settlementPrice = ethers.formatUnits(parsed.args.settlementPrice, 8);
            isRefund = parsed.args.isRefund;
          }
        } catch {}
      }

      // Update database
      const db = this.supabase.getClient();
      await db
        .from('markets')
        .update({
          status: isRefund ? 'refunded' : 'settled',
          winning_pool: winningPool,
          settlement_price: settlementPrice,
          is_refund: isRefund,
          oracle_tx_hash: receipt.hash,
        })
        .eq('id', market.id);

      // Update predictions
      if (!isRefund && winningPool) {
        await this.updatePredictions(market.id, winningPool, parseFloat(market.total_stake));
        await this.xp.processMarketSettlement(market.id);

        // Update jackpot_fee_collected — 2.5% dari total stake
        const jackpotFee = parseFloat(market.total_stake) * 0.025;
        await db
          .from('markets')
          .update({ jackpot_fee_collected: jackpotFee.toFixed(6) })
          .eq('id', market.id);
      } else if (isRefund) {
        await this.markPredictionsAsRefund(market.id);
      }

      this.logger.log(
        `Market ${market.id} settled: pool ${winningPool}, price ${settlementPrice}, refund: ${isRefund}`,
      );
    } catch (err) {
      this.logger.error(`Failed to settle market ${market.id}:`, err);
    }
  }

  /**
   * Update predictions setelah settlement normal.
   */
  private async updatePredictions(
    marketId: string,
    winningPool: number,
    totalStake: number,
  ) {
    const db = this.supabase.getClient();

    // Ambil semua predictions untuk market ini
    const { data: predictions } = await db
      .from('predictions')
      .select('*')
      .eq('market_id', marketId);

    if (!predictions?.length) return;

    const winningPredictions = predictions.filter((p) => p.pool_id === winningPool);
    const winningStake = winningPredictions.reduce(
      (sum, p) => sum + parseFloat(p.stake_amount),
      0,
    );
    const netPool = totalStake * (1 - 0.05);

    for (const prediction of predictions) {
      const isWinner = prediction.pool_id === winningPool;
      const payoutAmount =
        isWinner && winningStake > 0
          ? (netPool * parseFloat(prediction.stake_amount)) / winningStake
          : 0;

      await db
        .from('predictions')
        .update({
          is_winner: isWinner,
          payout_amount: payoutAmount.toFixed(6),
        })
        .eq('id', prediction.id);
    }
  }

  /**
   * Mark semua predictions sebagai refund.
   */
  private async markPredictionsAsRefund(marketId: string) {
    const db = this.supabase.getClient();

    await db
      .from('predictions')
      .update({
        is_refund: true,
        payout_amount: null,
        is_winner: false,
      })
      .eq('market_id', marketId);
  }

  /**
   * Generate range bounds menggunakan Volatility-Adaptive Probability Range.
   * Input: BTC price (Chainlink) + 7D/30D Realized Vol + 24H ATR (Binance)
   * Target distribusi: Pool A=10%, B=20%, C=40%, D=20%, E=10%
   * Fallback ke flat 3% kalau Binance tidak tersedia.
   */
  private async generateRangeBounds(): Promise<bigint[]> {
    // Ambil harga BTC dari Chainlink
    const feedAbi = [
      'function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)',
    ];

    const feed = new ethers.Contract(
      ethers.getAddress(this.config.get<string>('blockchain.chainlinkFeed')!),
      feedAbi,
      this.provider,
    );

    const [, price] = await feed.latestRoundData();
    const btcPrice = Number(ethers.formatUnits(price, 8));

    let dailyMove = btcPrice * 0.03; // fallback flat 3%

    try {
      // Ambil 30 hari OHLCV dari Binance public API (no API key required)
      const url = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=31';
      const response = await fetch(url);
      const candles = await response.json() as any[];

      if (candles && candles.length >= 8) {
        // Hitung daily returns untuk realized volatility
        const closes: number[] = candles.map((c: any) => parseFloat(c[4]));
        const highs: number[] = candles.map((c: any) => parseFloat(c[2]));
        const lows: number[] = candles.map((c: any) => parseFloat(c[3]));

        const dailyReturns: number[] = [];
        for (let i = 1; i < closes.length; i++) {
          dailyReturns.push(Math.log(closes[i] / closes[i - 1]));
        }

        // 7D Realized Volatility (annualized → daily)
        const returns7d = dailyReturns.slice(-7);
        const mean7d = returns7d.reduce((a, b) => a + b, 0) / returns7d.length;
        const variance7d = returns7d.reduce((a, b) => a + Math.pow(b - mean7d, 2), 0) / returns7d.length;
        const vol7d = Math.sqrt(variance7d); // daily vol

        // 30D Realized Volatility
        const returns30d = dailyReturns.slice(-30);
        const mean30d = returns30d.reduce((a, b) => a + b, 0) / returns30d.length;
        const variance30d = returns30d.reduce((a, b) => a + Math.pow(b - mean30d, 2), 0) / returns30d.length;
        const vol30d = Math.sqrt(variance30d); // daily vol

        // 24H ATR (Average True Range) — pakai 14 hari terakhir
        const atrValues: number[] = [];
        for (let i = 1; i < Math.min(candles.length, 15); i++) {
          const high = highs[highs.length - i];
          const low = lows[lows.length - i];
          const prevClose = closes[closes.length - i - 1];
          const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
          atrValues.push(tr);
        }
        const atr = atrValues.reduce((a, b) => a + b, 0) / atrValues.length;
        const atrPct = atr / btcPrice; // ATR sebagai % dari harga

        // Gabungkan: weighted average vol
        // 7D vol lebih relevan untuk next-day prediction (weight 50%)
        // 30D vol sebagai anchor (weight 30%)
        // ATR % sebagai floor (weight 20%)
        const blendedVol = (vol7d * 0.50) + (vol30d * 0.30) + (atrPct * 0.20);

        // Expected daily move = blended vol (sudah dalam daily terms)
        // Minimum 1.5%, maximum 8% untuk hindari extreme ranges
        const expectedMove = Math.max(0.015, Math.min(0.08, blendedVol));
        dailyMove = btcPrice * expectedMove;

        this.logger.log(
          `Range Engine: vol7d=${(vol7d * 100).toFixed(2)}%, vol30d=${(vol30d * 100).toFixed(2)}%, ` +
          `atr=${(atrPct * 100).toFixed(2)}%, blended=${(blendedVol * 100).toFixed(2)}%, ` +
          `dailyMove=$${dailyMove.toFixed(0)}`
        );
      }
    } catch (err) {
      this.logger.warn('Binance API unavailable, falling back to flat 3% range:', err);
    }

    // Pool boundaries — target distribusi 10-20-40-20-10%
    // Pool C (tengah, ~40%) = [price - 0.5x move, price + 0.5x move]
    // Pool B/D (~20%) = [price - 1.5x, price - 0.5x] dan [price + 0.5x, price + 1.5x]
    // Pool A/E (~10%) = di luar itu
    const poolA = Math.round((btcPrice - dailyMove * 1.5) * 1e8);
    const poolB = Math.round((btcPrice - dailyMove * 0.5) * 1e8);
    const poolC = Math.round((btcPrice + dailyMove * 0.5) * 1e8);
    const poolD = Math.round((btcPrice + dailyMove * 1.5) * 1e8);

    return [BigInt(poolA), BigInt(poolB), BigInt(poolC), BigInt(poolD)];
  }
}
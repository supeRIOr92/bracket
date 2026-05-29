import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { ethers } from 'ethers';

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
  @Cron('0 0 * * *', { timeZone: 'UTC' })
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
   * Generate range bounds berdasarkan BTC price saat ini.
   * Simple implementation — target distribusi A=10%, B=20%, C=40%, D=20%, E=10%.
   * Bounds dalam Chainlink 8-decimal format.
   */
  private async generateRangeBounds(): Promise<bigint[]> {
    // Ambil harga BTC dari Chainlink
    const feedAbi = [
      'function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)',
    ];

    const feed = new ethers.Contract(
      this.config.get<string>('blockchain.chainlinkFeed')!,
      feedAbi,
      this.provider,
    );

    const [, price] = await feed.latestRoundData();
    const btcPrice = Number(ethers.formatUnits(price, 8));

    // Daily expected move: gunakan 3% sebagai baseline
    const dailyMove = btcPrice * 0.03;

    // Pool boundaries
    const poolA = Math.round((btcPrice - dailyMove * 1.5) * 1e8);
    const poolB = Math.round((btcPrice - dailyMove * 0.5) * 1e8);
    const poolC = Math.round((btcPrice + dailyMove * 0.5) * 1e8);
    const poolD = Math.round((btcPrice + dailyMove * 1.5) * 1e8);

    return [BigInt(poolA), BigInt(poolB), BigInt(poolC), BigInt(poolD)];
  }
}
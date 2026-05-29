import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { ethers } from 'ethers';

@Injectable()
export class MarketsService {
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
}
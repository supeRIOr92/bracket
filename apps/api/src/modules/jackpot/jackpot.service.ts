import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class JackpotService {
  private readonly logger = new Logger(JackpotService.name);

  constructor(private supabase: SupabaseService) {}

  async getCurrentJackpot() {
    const db = this.supabase.getClient();
    const undistributed = await this.getUndistributedPool(db);

    const { count: eligibleCount } = await db
      .from('jackpot_eligibility')
      .select('*', { count: 'exact', head: true })
      .eq('is_eligible', true);

    return {
      totalPool: undistributed.toFixed(2),
      eligibleUsers: eligibleCount || 0,
      season: this.getCurrentSeason(),
      distribution: {
        community: '50%',
        skill: '25%',
        activity: '15%',
        contrarian: '10%',
      },
    };
  }

  private async getUndistributedPool(db: any): Promise<number> {
    const { data: lastDraw } = await db
      .from('jackpot_draws')
      .select('draw_date')
      .order('draw_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    let query = db
      .from('markets')
      .select('jackpot_fee_collected')
      .eq('status', 'settled');

    if (lastDraw?.draw_date) {
      query = query.gt('updated_at', lastDraw.draw_date);
    }

    const { data: markets } = await query;
    return (markets || []).reduce(
      (sum: number, m: any) => sum + parseFloat(m.jackpot_fee_collected || '0'),
      0,
    );
  }

  async checkEligibility(userId: string) {
    const db = this.supabase.getClient();

    const { data: user } = await db
      .from('users')
      .select('created_at')
      .eq('id', userId)
      .single();

    if (!user) return { isEligible: false };

    const accountAgeDays = Math.floor(
      (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );

    const { count: settledPredictions } = await db
      .from('predictions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('is_winner', 'is', null);

    const isEligible = accountAgeDays >= 30 && (settledPredictions || 0) >= 20;

    await db.from('jackpot_eligibility').upsert({
      user_id: userId,
      account_age_days: accountAgeDays,
      settled_predictions: settledPredictions || 0,
      is_eligible: isEligible,
      season: this.getCurrentSeason(),
    });

    return {
      isEligible,
      accountAgeDays,
      settledPredictions: settledPredictions || 0,
      requirements: {
        accountAge: { required: 30, current: accountAgeDays, met: accountAgeDays >= 30 },
        predictions: { required: 20, current: settledPredictions || 0, met: (settledPredictions || 0) >= 20 },
      },
    };
  }

  async getHistory(limit = 20) {
    const db = this.supabase.getClient();
    const { data, error } = await db
      .from('jackpot_draws')
      .select(`*, users(username, wallet_address)`)
      .order('draw_date', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
  }

  @Cron('0 1 * * *', { timeZone: 'UTC' })
  async refreshAllEligibility() {
    this.logger.log('Refreshing jackpot eligibility for all users...');
    const db = this.supabase.getClient();
    const { data: users } = await db.from('users').select('id');
    if (!users?.length) return;
    for (const user of users) {
      await this.checkEligibility(user.id);
    }
    this.logger.log(`Eligibility refreshed for ${users.length} users`);
  }

  @Cron('0 12 1 * *', { timeZone: 'UTC' })
  async monthlyDraw() {
    this.logger.log('Running monthly jackpot draw...');
    const db = this.supabase.getClient();
    const currentSeason = this.getCurrentSeason();
    const { data: eligibleUsers } = await db
      .from('jackpot_eligibility')
      .select('user_id')
      .eq('is_eligible', true)
      .eq('season', currentSeason);

    if (!eligibleUsers?.length) {
      this.logger.log('No eligible users for jackpot draw');
      return;
    }

    const basePrize = await this.getUndistributedPool(db);

    if (basePrize <= 0) {
      this.logger.log('Jackpot pool is empty — skipping draw');
      return;
    }

    await this.drawCategory('community', eligibleUsers.map((u) => u.user_id), basePrize * 0.5, currentSeason);
    await this.drawSkillJackpot(basePrize * 0.25, currentSeason);
    await this.drawActivityJackpot(basePrize * 0.15, currentSeason);
    await this.drawContrarianJackpot(basePrize * 0.10, currentSeason);

    this.logger.log(`Monthly draw complete. Total: ${basePrize.toFixed(2)} USDC`);
  }

  private async drawCategory(category: string, userIds: string[], prizeAmount: number, season: string) {
    if (!userIds.length) return;
    const db = this.supabase.getClient();
    const winner = userIds[Math.floor(Math.random() * userIds.length)];
    const today = new Date().toISOString().split('T')[0];
    await db.from('jackpot_draws').insert({
      season,
      draw_date: today,
      category,
      winner_user_id: winner,
      prize_amount: prizeAmount.toFixed(6),
    });
    this.logger.log(`Jackpot ${category}: winner ${winner}, prize ${prizeAmount.toFixed(2)} USDC`);
  }

  private async drawSkillJackpot(prizeAmount: number, season: string) {
    const db = this.supabase.getClient();
    const { data: topUsers } = await db
      .from('season_rankings')
      .select('user_id')
      .eq('season', season)
      .order('rank', { ascending: true })
      .limit(3);
    if (!topUsers?.length) return;
    await this.drawCategory('skill', topUsers.map((u) => u.user_id), prizeAmount, season);
  }

  private async drawActivityJackpot(prizeAmount: number, season: string) {
    const db = this.supabase.getClient();
    const { data: topStreak } = await db
      .from('user_stats')
      .select('user_id')
      .order('current_streak', { ascending: false })
      .limit(1);
    if (!topStreak?.length) return;
    await this.drawCategory('activity', [topStreak[0].user_id], prizeAmount, season);
  }

  private async drawContrarianJackpot(prizeAmount: number, season: string) {
    const db = this.supabase.getClient();
    const { data: topContrarian } = await db
      .from('user_stats')
      .select('user_id, contrarian_attempts, contrarian_wins')
      .gte('contrarian_attempts', 10)
      .order('contrarian_wins', { ascending: false })
      .limit(1);
    if (!topContrarian?.length) return;
    await this.drawCategory('contrarian', [topContrarian[0].user_id], prizeAmount, season);
  }

  private getCurrentSeason(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}

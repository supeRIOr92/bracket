import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class JackpotService {
  private readonly logger = new Logger(JackpotService.name);

  constructor(private supabase: SupabaseService) {}

  /**
   * Ambil info jackpot saat ini — prize pool + eligibility count.
   */
  async getCurrentJackpot() {
    const db = this.supabase.getClient();

    // Total jackpot treasury (dari fee yang terkumpul)
    const { data: markets } = await db
      .from('markets')
      .select('jackpot_fee_collected')
      .eq('status', 'settled');

    const totalJackpot = (markets || []).reduce(
      (sum, m) => sum + parseFloat(m.jackpot_fee_collected || '0'),
      0,
    );

    // Jumlah eligible users
    const { count: eligibleCount } = await db
      .from('jackpot_eligibility')
      .select('*', { count: 'exact', head: true })
      .eq('is_eligible', true);

    const currentSeason = this.getCurrentSeason();

    return {
      totalPool: totalJackpot.toFixed(2),
      eligibleUsers: eligibleCount || 0,
      season: currentSeason,
      distribution: {
        community: '50%',
        skill: '25%',
        activity: '15%',
        contrarian: '10%',
      },
    };
  }

  /**
   * Cek eligibility jackpot untuk user.
   * Eligible jika: account >= 30 hari DAN settled predictions >= 20.
   */
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
      .not('is_winner', 'is', null); // sudah settled

    const isEligible = accountAgeDays >= 30 && (settledPredictions || 0) >= 20;

    // Upsert eligibility
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

  /**
   * Weekly jackpot draw — setiap Senin jam 12:00 UTC.
   */
  @Cron('0 12 * * 1', { timeZone: 'UTC' })
  async weeklyDraw() {
    this.logger.log('Running weekly jackpot draw...');

    const db = this.supabase.getClient();
    const currentSeason = this.getCurrentSeason();

    // Ambil semua eligible users
    const { data: eligibleUsers } = await db
      .from('jackpot_eligibility')
      .select('user_id')
      .eq('is_eligible', true)
      .eq('season', currentSeason);

    if (!eligibleUsers?.length) {
      this.logger.log('No eligible users for jackpot draw');
      return;
    }

    // Hitung prize per kategori (simplified — gunakan persentase dari pool kecil)
    const basePrize = 100; // USDC — akan diganti dengan actual treasury balance

    await this.drawCategory('community', eligibleUsers.map((u) => u.user_id), basePrize * 0.5, currentSeason);
    await this.drawSkillJackpot(basePrize * 0.25, currentSeason);
    await this.drawActivityJackpot(basePrize * 0.15, currentSeason);
    await this.drawContrarianJackpot(basePrize * 0.10, currentSeason);
  }

  private async drawCategory(
    category: string,
    userIds: string[],
    prizeAmount: number,
    season: string,
  ) {
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

    this.logger.log(`Jackpot ${category}: winner ${winner}, prize ${prizeAmount} USDC`);
  }

  private async drawSkillJackpot(prizeAmount: number, season: string) {
    const db = this.supabase.getClient();

    // Top 3 PR Score season ini
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

    // User dengan streak terpanjang
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

    // User dengan contrarian win rate tertinggi (min 10 predictions di A/E)
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
    const year = now.getFullYear();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    return `${year}-Q${quarter}`;
  }
}
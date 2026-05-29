import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';

interface PredictionResult {
  userId: string;
  isWinner: boolean;
  poolId: number; // 1..5
  poolParticipationRate: number; // 0..1 (berapa % dari total stake di pool ini)
  totalPredictions: number;
  isRefund: boolean;
}

@Injectable()
export class XpService {
  private readonly logger = new Logger(XpService.name);

  constructor(private supabase: SupabaseService) {}

  /**
   * Process XP dan PR Score setelah market settled.
   * Dipanggil oleh SettlementService.
   */
  async processMarketSettlement(marketId: string) {
    const db = this.supabase.getClient();

    const { data: market } = await db
      .from('markets')
      .select('*, predictions(*)')
      .eq('id', marketId)
      .single();

    if (!market || market.is_refund) {
      this.logger.log(`Market ${marketId} is refund — skip XP processing`);
      return;
    }

    const predictions = market.predictions || [];
    if (!predictions.length) return;

    const totalStake = parseFloat(market.total_stake) || 0;

    for (const prediction of predictions) {
      const poolStakeKey = `pool_${['a', 'b', 'c', 'd', 'e'][prediction.pool_id - 1]}_stake`;
      const poolStake = parseFloat(market[poolStakeKey]) || 0;
      const poolRate = totalStake > 0 ? poolStake / totalStake : 1;

      await this.processUserResult({
        userId: prediction.user_id,
        isWinner: prediction.is_winner,
        poolId: prediction.pool_id,
        poolParticipationRate: poolRate,
        totalPredictions: 0, // akan di-fetch dari DB
        isRefund: false,
      });
    }
  }

  /**
   * Update XP dan PR Score untuk satu user.
   */
  async processUserResult(result: PredictionResult) {
    const db = this.supabase.getClient();

    const { data: stats } = await db
      .from('user_stats')
      .select('*')
      .eq('user_id', result.userId)
      .single();

    if (!stats) return;

    // ── XP Calculation ──────────────────────────────────────────────────────

    let xpGained = 10; // base participation XP

    if (result.isWinner) {
      xpGained += 50; // win bonus

      // Difficulty bonus — pool ekstrem (A=1 atau E=5) lebih besar
      if (result.poolId === 1 || result.poolId === 5) {
        xpGained += 30; // extreme pool bonus
      }

      // Contrarian bonus — pool dengan < 20% participation
      if (result.poolParticipationRate < 0.20) {
        xpGained += 20;
      }

      // Streak bonus
      const streak = stats.current_streak + 1;
      if (streak >= 3) xpGained += Math.min(streak * 5, 50);
    }

    // ── PR Score Calculation ─────────────────────────────────────────────────
    // PR Score = (Accuracy × 0.40) + (Difficulty × 0.30) + (Consistency × 0.20) + (Contrarian × 0.10)
    // Scale: 0 - 3000+

    const newTotalPredictions = stats.total_predictions + 1;
    const newTotalWins = stats.total_wins + (result.isWinner ? 1 : 0);
    const newStreak = result.isWinner ? stats.current_streak + 1 : 0;
    const newBestStreak = Math.max(stats.best_streak, newStreak);

    // Accuracy component (0 - 1200)
    const accuracy = newTotalPredictions > 0 ? newTotalWins / newTotalPredictions : 0;
    const accuracyScore = accuracy * 1200;

    // Difficulty component — Surprise Factor 1/participationRate (capped)
    // Menang di pool sedikit orang = lebih besar
    let surpriseFactor = result.isWinner
      ? Math.min(1 / (result.poolParticipationRate || 0.01), 10) / 10
      : 0;
    const difficultyScore = surpriseFactor * 900;

    // Consistency component — more predictions = more confident score
    // Mirip Glicko: makin banyak data, makin valid
    const consistencyFactor = Math.min(newTotalPredictions / 100, 1);
    const consistencyScore = consistencyFactor * 600;

    // Contrarian Success component
    const isContrarian = result.poolId === 1 || result.poolId === 5;
    const newContrarianAttempts = stats.contrarian_attempts + (isContrarian ? 1 : 0);
    const newContrarianWins = stats.contrarian_wins + (isContrarian && result.isWinner ? 1 : 0);
    const contrarianRate = newContrarianAttempts > 0
      ? newContrarianWins / newContrarianAttempts
      : 0;
    const contrarianScore = contrarianRate * 300;

    const newPrScore = Math.round(
      accuracyScore + difficultyScore + consistencyScore + contrarianScore,
    );

    // ── Level Calculation ────────────────────────────────────────────────────
    const newXp = stats.xp + xpGained;
    const newLevel = this.calculateLevel(newXp);

    // ── Archetype Update ─────────────────────────────────────────────────────
    const archetype = this.calculateArchetype({
      totalPredictions: newTotalPredictions,
      totalWins: newTotalWins,
      contrarianAttempts: newContrarianAttempts,
      contrarianWins: newContrarianWins,
      currentStreak: newStreak,
    });

    // ── Update DB ────────────────────────────────────────────────────────────
    await db
      .from('user_stats')
      .update({
        pr_score: newPrScore,
        xp: newXp,
        level: newLevel,
        total_predictions: newTotalPredictions,
        total_wins: newTotalWins,
        current_streak: newStreak,
        best_streak: newBestStreak,
        contrarian_attempts: newContrarianAttempts,
        contrarian_wins: newContrarianWins,
        archetype,
      })
      .eq('user_id', result.userId);

    this.logger.log(
      `User ${result.userId}: +${xpGained} XP, PR Score: ${newPrScore}, Level: ${newLevel}`,
    );
  }

  private calculateLevel(xp: number): number {
    // Level up setiap 1000 XP (simple linear)
    return Math.floor(xp / 1000) + 1;
  }

  private calculateArchetype(stats: {
    totalPredictions: number;
    totalWins: number;
    contrarianAttempts: number;
    contrarianWins: number;
    currentStreak: number;
  }): string | null {
    if (stats.totalPredictions < 10) return null;

    const winRate = stats.totalWins / stats.totalPredictions;
    const contrarianRate = stats.contrarianAttempts > 0
      ? stats.contrarianAttempts / stats.totalPredictions
      : 0;

    if (contrarianRate > 0.5) return 'contrarian_predictor';
    if (winRate > 0.6 && stats.totalPredictions > 30) return 'sharpshooter';
    if (winRate > 0.5 && stats.currentStreak >= 5) return 'value_hunter';
    return 'consensus_predictor';
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class UsersService {
  constructor(private supabase: SupabaseService) {}

  async getProfile(userId: string) {
    const db = this.supabase.getClient();

    const { data, error } = await db
      .from('users')
      .select('*, user_stats(*)')
      .eq('id', userId)
      .single();

    if (error || !data) throw new NotFoundException('User not found');
    return data;
  }

  async getProfileByWallet(walletAddress: string) {
    const db = this.supabase.getClient();

    const { data, error } = await db
      .from('users')
      .select('*, user_stats(*)')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error || !data) throw new NotFoundException('User not found');
    return data;
  }

  async updateProfile(
    userId: string,
    updates: { username?: string; bio?: string; avatarUrl?: string },
  ) {
    const db = this.supabase.getClient();

    const { data, error } = await db
      .from('users')
      .update({
        username: updates.username,
        bio: updates.bio,
        avatar_url: updates.avatarUrl,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) throw new Error('Cannot follow yourself');

    const db = this.supabase.getClient();
    await db.from('follows').upsert({
      follower_id: followerId,
      following_id: followingId,
    });

    return { success: true };
  }

  async unfollowUser(followerId: string, followingId: string) {
    const db = this.supabase.getClient();

    await db
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    return { success: true };
  }

  async getLeaderboard(
    category: 'pr_score' | 'win_rate' | 'streak' | 'contrarian' | 'roi' = 'pr_score',
    limit = 50,
  ) {
    const db = this.supabase.getClient();

    let orderColumn = 'pr_score';
    if (category === 'win_rate') orderColumn = 'win_rate';
    if (category === 'streak') orderColumn = 'best_streak';
    if (category === 'contrarian') orderColumn = 'contrarian_win_rate';
    if (category === 'roi') orderColumn = 'roi';

    const { data, error } = await db
      .from('leaderboard')
      .select('*')
      .order(orderColumn, { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data;
  }

  async getUserRank(userId: string) {
    const db = this.supabase.getClient();

    const { data } = await db
      .from('leaderboard')
      .select('global_rank, pr_score')
      .eq('id', userId)
      .single();

    return data;
  }
}
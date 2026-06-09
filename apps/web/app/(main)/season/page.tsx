'use client';

import { useQuery } from '@tanstack/react-query';
import { useWallets } from '@privy-io/react-auth';
import { usersApi, seasonsApi } from '@/lib/api';
import { formatPRScore, getPRLabel, formatAddress } from '@/lib/utils';
import { Trophy, Calendar, TrendingUp } from 'lucide-react';

export default function SeasonPage() {
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address?.toLowerCase();

  const { data: season, isLoading: seasonLoading } = useQuery({
    queryKey: ['season', 'current'],
    queryFn: async () => {
      const res = await seasonsApi.getCurrent();
      return res.data;
    },
  });

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard', 'season'],
    queryFn: async () => {
      const res = await usersApi.getLeaderboard('pr_score');
      return res.data;
    },
  });

  const { data: myProfile } = useQuery({
    queryKey: ['profile', walletAddress],
    queryFn: async () => (await usersApi.getProfileByAddress(walletAddress!)).data,
    enabled: !!walletAddress,
  });

  const seasonId = season?.id ?? '—';
  const startDate = season?.start_date
    ? new Date(season.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';
  const endDate = season?.end_date
    ? new Date(season.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';
  const daysLeft = season?.daysLeft ?? 0;
  return(
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {seasonLoading ? 'Loading...' : `Season ${seasonId}`}
          </h1>
          <p className="text-gray-500 mt-1">{startDate} – {endDate}</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
          <Calendar className="w-3.5 h-3.5" />
          {daysLeft > 0 ? `${daysLeft} days left` : 'Season ended'}
        </div>
      </div>

      {/* Season Rewards */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Season Rewards
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
            { rank: '#1', reward: 'Jackpot + Legend badge' },
            { rank: '#2', reward: 'Jackpot + Expert badge' },
            { rank: '#3', reward: 'Jackpot + Advanced badge' },
            ].map((item) => (
        <div key={item.rank} className="bg-white/10 rounded-xl p-3 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1">
        <p className="text-xl font-bold shrink-0">{item.rank}</p>
        <p className="text-blue-100 text-xs leading-snug">{item.reward}</p>
        </div>
          ))}
        </div>
        <p className="text-blue-200 text-xs mt-4">
          Top 3 PR Score at season end qualify for Skill Jackpot draw.
        </p>
      </div>

      {/* Your Standing */}
      {myProfile?.user_stats && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Your Standing</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">PR Score</p>
              <p className="text-2xl font-bold text-blue-600">{formatPRScore(myProfile.user_stats.pr_score)}</p>
              <p className="text-xs text-gray-400">{getPRLabel(myProfile.user_stats.pr_score)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Predictions</p>
              <p className="text-2xl font-bold text-gray-900">{myProfile.user_stats.total_predictions}</p>
              <p className="text-xs text-gray-400">{myProfile.user_stats.total_wins} wins</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Best Streak</p>
              <p className="text-2xl font-bold text-gray-900">{myProfile.user_stats.best_streak}</p>
              <p className="text-xs text-gray-400">days</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Season Leaderboard</h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !leaderboard?.length ? (
          <p className="text-center text-gray-400 py-12 text-sm">No data yet.</p>
        ) : (<div className="divide-y divide-gray-50">
            {leaderboard.slice(0, 20).map((user: any, index: number) => (
              <div key={user.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <span className={`w-8 text-sm font-bold ${
                    index === 0 ? 'text-yellow-500' :
                    index === 1 ? 'text-gray-400' :
                    index === 2 ? 'text-amber-600' : 'text-gray-300'
                  }`}>#{index + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.username || formatAddress(user.id)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {getPRLabel(user.pr_score)} · {user.total_predictions} predictions
                    </p>
                  </div>
                </div>
                <p className="font-bold text-blue-600">{formatPRScore(user.pr_score)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

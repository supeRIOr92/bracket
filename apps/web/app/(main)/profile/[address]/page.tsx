'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, predictionsApi } from '@/lib/api';
import { formatAddress, formatUSDC } from '@/lib/utils';
import {
  User, Copy, Trophy, Zap, Target, TrendingUp,
  CheckCircle, UserPlus, UserMinus, BarChart2, List, Award
} from 'lucide-react';

const POOL_LABELS = ['A', 'B', 'C', 'D', 'E'];
const POOL_COLORS = ['bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700'];

const TABS = ['Overview', 'Performance', 'Predictions', 'Achievements'];

export default function ProfilePage() {
  const { address } = useParams<{ address: string }>();
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Overview');
  const [copied, setCopied] = useState(false);

  const connectedAddress = wallets[0]?.address?.toLowerCase();
  const isOwnProfile = authenticated && connectedAddress === address?.toLowerCase();

  const copyAddress = () => {
    navigator.clipboard.writeText(address ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { data: user, isLoading } = useQuery({
    queryKey: ['profile', address],
    queryFn: async () => (await usersApi.getProfileByAddress(address)).data,
  });

  const { data: predictions } = useQuery({
    queryKey: ['predictions-public', address],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/predictions/address/${address}`
      );
      return res.json();
    },
    enabled: !!address,
  });

  const followMutation = useMutation({
    mutationFn: () => usersApi.follow(user?.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', address] }),
  });

  const unfollowMutation = useMutation({
    mutationFn: () => usersApi.unfollow(user?.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', address] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">User not found.</p>
      </div>
    );
  }

  const stats = user.user_stats;
  const winRate = stats?.total_predictions > 0
    ? ((stats.total_wins / stats.total_predictions) * 100).toFixed(1)
    : '0.0';

  // Pool distribution untuk Performance tab
  const poolCounts = [0, 0, 0, 0, 0];
  const settledPreds = (predictions || []).filter((p: any) => p.markets?.status === 'settled');
  settledPreds.forEach((p: any) => {
    if (p.pool_id >= 1 && p.pool_id <= 5) poolCounts[p.pool_id - 1]++;
  });
  const totalPreds = settledPreds.length || 1;
  return(
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {user.username || formatAddress(address)}
              </h1>
              <button
                onClick={copyAddress}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-1"
              >
                <span className="font-mono">{formatAddress(address)}</span>
                {copied ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </button>
              {user.bio && <p className="text-sm text-gray-500 mt-1">{user.bio}</p>}
              <p className="text-xs text-gray-400 mt-1">
                Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Follow button */}
          {authenticated && !isOwnProfile && (
            <button
              onClick={() =>
                user?.isFollowing ? unfollowMutation.mutate() : followMutation.mutate()
              }
              disabled={followMutation.isPending || unfollowMutation.isPending}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                user?.isFollowing
                  ? 'border border-gray-300 text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                  : 'border border-blue-600 text-blue-600 hover:bg-blue-50'
              }`}
            >
              {user?.isFollowing ? (
                <><UserMinus className="w-4 h-4" /> Unfollow</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Follow</>
              )}
            </button>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3 mt-6">
          <div className="text-center">
            <p className="text-lg font-bold text-blue-600">{stats?.pr_score || 0}</p>
            <p className="text-xs text-gray-400">PR Score</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{winRate}%</p>
            <p className="text-xs text-gray-400">Win Rate</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{stats?.current_streak || 0}</p>
            <p className="text-xs text-gray-400">Streak</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">Lv.{stats?.level || 1}</p>
            <p className="text-xs text-gray-400">Level</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-w-fit ${
            activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
          {tab}
        </button>
      ))}
      </div>

      {/* Tab Content */}

      {/* OVERVIEW */}
      {activeTab === 'Overview' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Stats</h2>
            <div className="space-y-3">
              {[
                { label: 'Total Predictions', value: stats?.total_predictions || 0 },
                        { label: 'Total Wins', value: stats?.total_wins || 0 },
                { label: 'Best Streak', value: stats?.best_streak || 0 },
                { label: 'Total Wagered', value: formatUSDC(parseFloat(stats?.total_wagered || '0')) },
                { label: 'XP', value: (stats?.xp || 0).toLocaleString() },
                { label: 'Archetype', value: stats?.archetype ? stats.archetype.replace(/_/g, ' ') : '—' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900 capitalize">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PERFORMANCE */}
      {activeTab === 'Performance' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Pool Distribution</h2>
            <p className="text-xs text-gray-400 mb-4">Which pools this predictor bets on</p>
            <div className="space-y-3">
              {POOL_LABELS.map((label, i) => {
                const count = poolCounts[i];
                const pct = Math.round((count / totalPreds) * 100);
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${POOL_COLORS[i]}`}>
                      Pool {label}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">{count}x ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{winRate}%</p>
                <p className="text-xs text-gray-400 mt-1">Win Rate</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{stats?.best_streak || 0}</p>
                <p className="text-xs text-gray-400 mt-1">Best Streak</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{stats?.total_predictions || 0}</p>
                <p className="text-xs text-gray-400 mt-1">Total Predictions</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{stats?.contrarian_wins || 0}</p>
                <p className="text-xs text-gray-400 mt-1">Contrarian Wins</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREDICTIONS */}
      {activeTab === 'Predictions' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Prediction History</h2>
          {!predictions?.length ? (
            <p className="text-gray-400 text-sm text-center py-8">No settled predictions yet.</p>
          ) : (
            <div className="space-y-3">
              {predictions.slice(0, 30).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${POOL_COLORS[(p.pool_id || 1) - 1]}`}>
                      Pool {POOL_LABELS[(p.pool_id || 1) - 1]}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-400">
                        Stake: {formatUSDC(parseFloat(p.stake_amount || '0'))}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {p.is_winner ? (
                      <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                        WON {formatUSDC(parseFloat(p.payout_amount || '0'))}
                      </span>
                    ) : p.is_refund ? (
                      <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                        REFUND
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded">
                        LOST
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ACHIEVEMENTS */}
      {activeTab === 'Achievements' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-2">Achievements</h2>
          <p className="text-xs text-gray-400 mb-6">Badges earned through prediction activity</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Trophy, label: 'First Win', desc: 'Win your first prediction', unlocked: (stats?.total_wins || 0) >= 1 },
              { icon: Zap, label: '3-Day Streak', desc: 'Win 3 days in a row', unlocked: (stats?.best_streak || 0) >= 3 },
              { icon: Zap, label: '7-Day Streak', desc: 'Win 7 days in a row', unlocked: (stats?.best_streak || 0) >= 7 },
              { icon: Target, label: 'Contrarian', desc: 'Win in Pool A or E', unlocked: (stats?.contrarian_wins || 0) >= 1 },
              { icon: BarChart2, label: 'Sharpshooter', desc: 'Reach 60% win rate (30+ preds)', unlocked: (stats?.total_predictions || 0) >= 30 && parseFloat(winRate) >= 60 },
              { icon: TrendingUp, label: 'Veteran', desc: 'Make 50 predictions', unlocked: (stats?.total_predictions || 0) >= 50 },
              { icon: Trophy, label: 'Legend', desc: 'Reach PR Score 2500+', unlocked: (stats?.pr_score || 0) >= 2500 },
              { icon: Award, label: 'Jackpot Winner', desc: 'Win a weekly jackpot', unlocked: false },
            ].map((badge) => (
              <div
                key={badge.label}
                className={`rounded-xl p-4 border ${
                  badge.unlocked
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-100 bg-gray-50 opacity-50'
                }`}
              >
                <badge.icon className={`w-6 h-6 mb-2 ${badge.unlocked ? 'text-blue-600' : 'text-gray-400'}`} />
                <p className="text-sm font-semibold text-gray-900">{badge.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{badge.desc}</p>
                {badge.unlocked && (
                  <span className="text-xs text-blue-600 font-medium mt-1 block">✓ Unlocked</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
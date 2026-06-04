'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWallets } from '@privy-io/react-auth';
import { usersApi } from '@/lib/api';
import { formatUSDC } from '@/lib/utils';
import { formatPRScore, getPRLabel, formatAddress } from '@/lib/utils';
import { Trophy, TrendingUp, Zap, Target } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
{ key: 'pr_score', label: 'PR Score', icon: TrendingUp },
{ key: 'win_rate', label: 'Win Rate', icon: Target },
{ key: 'streak', label: 'Streak', icon: Zap },
{ key: 'contrarian', label: 'Contrarian', icon: Trophy },
];

const PERIODS = [
{ key: 'all', label: 'All Time' },
{ key: 'season', label: 'Season' },
{ key: 'weekly', label: 'Weekly' },
{ key: 'daily', label: 'Daily' },
];

export default function LeaderboardPage() {
const [category, setCategory] = useState('pr_score');
const [period, setPeriod] = useState('all');

const { wallets } = useWallets();
const walletAddress = wallets[0]?.address?.toLowerCase();

const { data: leaderboard, isLoading } = useQuery({
queryKey: ['leaderboard', category],
queryFn: async () => {
const res = await usersApi.getLeaderboard(category);
return res.data;
},
});

const { data: myRank } = useQuery({
queryKey: ['my-rank', walletAddress],
queryFn: async () => {
const profile = await usersApi.getProfileByAddress(walletAddress!);
return profile.data;
},
enabled: !!walletAddress,
});

return (
<div className="space-y-6">

<div>
<h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
<p className="text-gray-500 mt-1">Top predictors this season</p>
</div>

{/* Category Tabs */}
<div className="flex flex-wrap gap-3 items-center justify-between">
<div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
{CATEGORIES.map((cat) => (
<button
key={cat.key}
onClick={() => setCategory(cat.key)}
className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
category === cat.key
? 'bg-white text-gray-900 shadow-sm'
: 'text-gray-500 hover:text-gray-700'
}`}
>
<cat.icon className="w-3.5 h-3.5" />
{cat.label}
</button>
))}
</div>

<div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
{PERIODS.map((p) => (
<button
key={p.key}
onClick={() => setPeriod(p.key)}
className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
period === p.key
? 'bg-white text-gray-900 shadow-sm'
: 'text-gray-500 hover:text-gray-700'
}`}
>
{p.label}
</button>
))}
</div>
</div>

{/* Table */}
<div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
{isLoading ? (
<div className="flex items-center justify-center h-64">
<div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
</div>
) : !leaderboard?.length ? (
<div className="text-center py-16 text-gray-400">
No data yet. Be the first to predict.
</div>
) : (
<div className="divide-y divide-gray-50">
{leaderboard.map((user: any, index: number) => (
<div
key={user.id}
className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
>
<div className="flex items-center gap-4">
<span className={`w-8 text-sm font-bold ${
index === 0 ? 'text-yellow-500' :
index === 1 ? 'text-gray-400' :
index === 2 ? 'text-amber-600' :
'text-gray-300'
}`}>
#{index + 1}
</span>
<div>
<Link href={`/profile/${user.wallet_address}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
{user.username || formatAddress(user.wallet_address)}
</Link>
<p className="text-xs text-gray-400">
{getPRLabel(user.pr_score)} · {user.total_predictions} predictions
</p>
</div>
</div>
<div className="text-right">
{category === 'pr_score' && (
<p className="font-bold text-blue-600">
{formatPRScore(user.pr_score)}
</p>
)}
{category === 'win_rate' && (
<p className="font-bold text-blue-600">
{user.win_rate}%
</p>
)}
{category === 'streak' && (
<p className="font-bold text-blue-600">
{user.best_streak} days
</p>
)}
{category === 'contrarian' && (
<p className="font-bold text-blue-600">
{user.contrarian_win_rate}%
</p>
)}
</div>
</div>
))}
</div>
)}
</div>

{/* Your Rank */}
{myRank?.user_stats && (
<div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
<div className="flex items-center gap-3">
<span className="text-blue-600 font-bold text-sm">Your Rank</span>
<div>
<p className="font-medium text-gray-900">
{myRank.username || myRank.wallet_address?.slice(0, 8) + '...'}
</p>
<p className="text-xs text-gray-400">
{myRank.user_stats.total_predictions} predictions
</p>
</div>
</div>
<div className="text-right">
{category === 'pr_score' && (
<p className="font-bold text-blue-600">{formatPRScore(myRank.user_stats.pr_score)}</p>
)}
{category === 'win_rate' && (
<p className="font-bold text-blue-600">
{myRank.user_stats.total_predictions > 0
? ((myRank.user_stats.total_wins / myRank.user_stats.total_predictions) * 100).toFixed(1)
: '0.0'}%
</p>
)}
{category === 'streak' && (
<p className="font-bold text-blue-600">{myRank.user_stats.best_streak} days</p>
)}
{category === 'contrarian' && (
<p className="font-bold text-blue-600">
{myRank.user_stats.contrarian_attempts > 0
? ((myRank.user_stats.contrarian_wins / myRank.user_stats.contrarian_attempts) * 100).toFixed(1)
: '0.0'}%
</p>
)}
</div>
</div>
)}

</div>
);
}


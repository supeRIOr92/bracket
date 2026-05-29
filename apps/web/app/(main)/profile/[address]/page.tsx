'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { usersApi, predictionsApi } from '@/lib/api';
import { formatAddress, formatUSDC, formatPRScore, getPRLabel } from '@/lib/utils';
import { getPoolLabel } from '@/lib/utils';
import { TrendingUp, Zap, Target, Award } from 'lucide-react';

const ARCHETYPE_LABEL: Record<string, string> = {
consensus_predictor: 'Consensus Predictor',
contrarian_predictor: 'Contrarian Predictor',
sharpshooter: 'Sharpshooter',
value_hunter: 'Value Hunter',
};

export default function ProfilePage() {
const { address } = useParams<{ address: string }>();const { data: user, isLoading } = useQuery({
queryKey: ['profile', address],
queryFn: async () => {
const res = await usersApi.getProfile(address);
return res.data;
},
});

const { data: predictions } = useQuery({
queryKey: ['predictions', user?.id],
queryFn: async () => {
const res = await predictionsApi.getHistory(user.id);
return res.data;
},
enabled: !!user?.id,
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
<div className="text-center py-24 text-gray-400">
User not found.
</div>
);
}

const stats = user.user_stats;
const winRate = stats.total_predictions > 0
? ((stats.total_wins / stats.total_predictions) * 100).toFixed(1)
: '0.0';return (
<div className="space-y-6">

{/* Profile Header */}
<div className="bg-white rounded-2xl border border-gray-100 p-6">
<div className="flex items-start justify-between">
<div className="flex items-center gap-4">
<div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
<span className="text-blue-600 font-bold text-lg">
{(user.username || formatAddress(user.wallet_address)).charAt(0).toUpperCase()}
</span>
</div>
<div>
<h1 className="text-xl font-bold text-gray-900">
{user.username || formatAddress(user.wallet_address)}
</h1>
<p className="text-sm text-gray-400">{formatAddress(user.wallet_address)}</p>
{stats.archetype && (
<span className="inline-block mt-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
{ARCHETYPE_LABEL[stats.archetype] || stats.archetype}
</span>
)}
</div>
</div>
<div className="text-right">
<p className="text-3xl font-bold text-blue-600">
{formatPRScore(stats.pr_score)}
</p>
<p className="text-sm text-gray-400">{getPRLabel(stats.pr_score)}</p>
</div>
</div>

{user.bio && (
<p className="mt-4 text-gray-500 text-sm">{user.bio}</p>
)}
</div>

{/* Stats Grid */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
{[
{ icon: Target, label: 'Win Rate', value: `${winRate}%` },
{ icon: TrendingUp, label: 'Predictions', value: stats.total_predictions },
{ icon: Zap, label: 'Best Streak', value: `${stats.best_streak} days` },
{ icon: Award, label: 'Level', value: `Lv. ${stats.level}` },
].map((stat) => (
<div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
<div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
<stat.icon className="w-3.5 h-3.5" />
{stat.label}
</div>
<p className="text-xl font-bold text-gray-900">{stat.value}</p>
</div>
))}
</div>

{/* Prediction History */}
<div className="bg-white rounded-2xl border border-gray-100 p-6">
<h2 className="font-semibold text-gray-900 mb-4">Prediction History</h2>

{!predictions?.length ? (
<p className="text-gray-400 text-sm text-center py-8">No predictions yet.</p>
) : (
<div className="space-y-3">
{predictions.slice(0, 20).map((p: any) => (
<div
key={p.id}
className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
>
<div className="flex items-center gap-3">
<span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
p.is_winner === true ? 'bg-green-100 text-green-700' :
p.is_winner === false ? 'bg-red-100 text-red-600' :
'bg-gray-100 text-gray-500'
}`}>
{getPoolLabel(p.pool_id)}
</span>
<div>
<p className="text-sm font-medium text-gray-900">
{new Date(p.created_at).toLocaleDateString('en-US', {
month: 'short',
day: 'numeric',
})}
</p>
<p className="text-xs text-gray-400">
Pool {getPoolLabel(p.pool_id)} · {formatUSDC(parseFloat(p.stake_amount))}
</p>
</div>
</div>
<div className="text-right">
{p.is_refund ? (
<span className="text-xs text-gray-400">Refunded</span>
) : p.is_winner === true ? (
<span className="text-sm font-semibold text-green-600">
+{formatUSDC(parseFloat(p.payout_amount || '0'))}
</span>
) : p.is_winner === false ? (
<span className="text-sm text-red-400">
-{formatUSDC(parseFloat(p.stake_amount))}
</span>
) : (
<span className="text-xs text-gray-400">Pending</span>
)}
</div>
</div>
))}
</div>
)}
</div>

</div>
);
}

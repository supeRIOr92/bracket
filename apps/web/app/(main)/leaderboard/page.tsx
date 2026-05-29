'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { formatPRScore, getPRLabel, formatAddress } from '@/lib/utils';
import { Trophy, TrendingUp, Zap, Target } from 'lucide-react';

const CATEGORIES = [
{ key: 'pr_score', label: 'PR Score', icon: TrendingUp },
{ key: 'win_rate', label: 'Win Rate', icon: Target },
{ key: 'streak', label: 'Streak', icon: Zap },
{ key: 'contrarian', label: 'Contrarian', icon: Trophy },
];

export default function LeaderboardPage() {
const [category, setCategory] = useState('pr_score');

const { data: leaderboard, isLoading } = useQuery({
queryKey: ['leaderboard', category],
queryFn: async () => {
const res = await usersApi.getLeaderboard(category);
return res.data;
},
});

return (
<div className="space-y-6">

<div>
<h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
<p className="text-gray-500 mt-1">Top predictors this season</p>
</div>

{/* Category Tabs */}
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
<p className="font-medium text-gray-900">
{user.username || formatAddress(user.id)}
</p>
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

</div>
);
}

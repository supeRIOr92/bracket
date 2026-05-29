'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useTodayMarket, useMarketPools } from '@/hooks/useMarket';
import { formatUSDC } from '@/lib/utils';
import { POOL_COLORS } from '@/lib/constants';
import { Clock, TrendingUp, Users } from 'lucide-react';

export default function DashboardPage() {
const { user } = usePrivy();
const { data: market, isLoading, error } = useTodayMarket();
const { data: pools } = useMarketPools(market?.id);

if (isLoading) {
return (
<div className="flex items-center justify-center h-64">
<div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
</div>
);
}

if (error || !market) {
return (
<div className="text-center py-24">
<p className="text-gray-400 text-lg">No active market today.</p>
<p className="text-gray-300 text-sm mt-2">Check back at midnight UTC.</p>
</div>
);
}

const closeTime = new Date(market.close_at).toLocaleTimeString('en-US', {
hour: '2-digit',
minute: '2-digit',
timeZone: 'UTC',
});

const isOpen = market.status === 'open';

const defaultPools = [
{
id: 1,
label: 'A',
range: `< $${market.pool_a_upper}`,
stake: market.pool_a_stake,
participationPct: market.pool_a_pct,
estimatedMultiplier: '—',
},
{
id: 2,
label: 'B',
range: `$${market.pool_a_upper} – $${market.pool_b_upper}`,
stake: market.pool_b_stake,
participationPct: market.pool_b_pct,
estimatedMultiplier: '—',
},
{
id: 3,
label: 'C',
range: `$${market.pool_b_upper} – $${market.pool_c_upper}`,
stake: market.pool_c_stake,
participationPct: market.pool_c_pct,
estimatedMultiplier: '—',
},
{
id: 4,
label: 'D',
range: `$${market.pool_c_upper} – $${market.pool_d_upper}`,
stake: market.pool_d_stake,
participationPct: market.pool_d_pct,
estimatedMultiplier: '—',
},
{
id: 5,
label: 'E',
range: `>= $${market.pool_d_upper}`,
stake: market.pool_e_stake,
participationPct: market.pool_e_pct,
estimatedMultiplier: '—',
},
];

const displayPools = pools || defaultPools;
return (
<div className="space-y-6">

{/* Header */}
<div className="flex items-start justify-between">
<div>
<h1 className="text-2xl font-bold text-gray-900">
{"Today's Market"}
</h1>
<p className="text-gray-500 mt-1">
{new Date(market.date).toLocaleDateString('en-US', {
weekday: 'long',
month: 'long',
day: 'numeric',
})}
</p>
</div>
<div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
isOpen ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
}`}>
<span className={`w-2 h-2 rounded-full ${
isOpen ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
}`} />
{isOpen
? 'Betting Open'
: market.status.charAt(0).toUpperCase() + market.status.slice(1)}
</div>
</div>

{/* Stats Row */}
<div className="grid grid-cols-3 gap-4">
<div className="bg-white rounded-xl border border-gray-100 p-5">
<div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
<TrendingUp className="w-4 h-4" />
Total Pool
</div>
<p className="text-2xl font-bold text-gray-900">
{formatUSDC(parseFloat(market.total_stake || '0'))}
</p>
</div>
<div className="bg-white rounded-xl border border-gray-100 p-5">
<div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
<Users className="w-4 h-4" />
Participants
</div>
<p className="text-2xl font-bold text-gray-900">—</p>
</div>
<div className="bg-white rounded-xl border border-gray-100 p-5">
<div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
<Clock className="w-4 h-4" />
Closes At
</div>
<p className="text-2xl font-bold text-gray-900">{closeTime} UTC</p>
</div>
</div>

{/* Pool Distribution */}
<div className="bg-white rounded-2xl border border-gray-100 p-6">
<div className="flex items-center justify-between mb-6">
<h2 className="font-semibold text-gray-900">Pool Distribution</h2>
<span className="text-xs text-gray-400">Updates every 15s</span>
</div>

<div className="space-y-3">
{displayPools.map((pool: any) => {
const colors = POOL_COLORS[pool.id as keyof typeof POOL_COLORS];
const pct = parseFloat(pool.participationPct || '0');

return (
<div
key={pool.id}
className={`border rounded-xl p-4 ${colors.border} ${colors.bg}`}
>
<div className="flex items-center justify-between mb-2">
<div className="flex items-center gap-3">
<span className={`font-bold text-sm w-6 ${colors.text}`}>
{pool.label}
</span>
<span className="text-gray-600 text-sm">{pool.range}</span>
</div>
<div className="flex items-center gap-4 text-sm">
<span className="text-gray-500">
{formatUSDC(parseFloat(pool.stake || '0'))}
</span>
<span className={`font-semibold ${colors.text}`}>
{pool.estimatedMultiplier !== '—'
? `${pool.estimatedMultiplier}x`
: '—'}
</span>
</div>
</div>
<div className="h-1.5 bg-white bg-opacity-60 rounded-full overflow-hidden">
<div
className={`h-full rounded-full ${colors.badge} transition-all duration-500`}
style={{ width: `${Math.min(pct, 100)}%` }}
/>
</div>
<div className="mt-1">
<span className="text-xs text-gray-400">{pct}% of pool</span>
</div>
</div>
);
})}
</div>

{isOpen && (
<div className="mt-6 pt-6 border-t border-gray-100">
<button
className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
onClick={() => {
window.location.href = `/market/${market.id}`;
}}
>
Place Prediction
</button>
</div>
)}
</div>

</div>
);
}

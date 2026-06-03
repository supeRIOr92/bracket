'use client';

import { Share2 } from 'lucide-react';
import { formatUSDC, formatPRScore, getPRLabel } from '@/lib/utils';

const POOL_NAMES: Record<number, string> = {
1: 'Extreme Bear',
2: 'Bearish',
3: 'Neutral',
4: 'Bullish',
5: 'Extreme Bull',
};

// ─── Mode 1: Bet Card (pre/post settlement) ──────────────────────────────────
interface BetCardProps {
mode: 'bet';
username: string;
poolId: number;
poolLabel: string;
stakeAmount: number;
payoutAmount?: number;
isWinner?: boolean;
prScore: number;
level: number;
date: string;
}

// ─── Mode 2: Stats Card (profile flex) ───────────────────────────────────────
interface StatsCardProps {
mode: 'stats';
username: string;
prScore: number;
level: number;
winRate: string;
totalPredictions: number;
bestStreak: number;
pnl: number;
archetype?: string | null;
}

type ShareCardProps = BetCardProps | StatsCardProps;

const ARCHETYPE_LABEL: Record<string, string> = {
consensus_predictor: 'Consensus Predictor',
contrarian_predictor: 'Contrarian Predictor',
sharpshooter: 'Sharpshooter',
value_hunter: 'Value Hunter',
};

export default function ShareCard(props: ShareCardProps) {
if (props.mode === 'stats') {
const { username, prScore, level, winRate, totalPredictions, bestStreak, pnl, archetype } = props;

const pnlPositive = pnl >= 0;
const shareText =
`${username} on BRACKET\n\n` +
`📊 PR Score: ${formatPRScore(prScore)} (${getPRLabel(prScore)})\n` +
`🎯 Win Rate: ${winRate}%\n` +
`🔥 Best Streak: ${bestStreak} days\n` +
`💰 Total PnL: ${pnlPositive ? '+' : ''}${formatUSDC(pnl)}\n` +
`⚡ Level ${level} · ${totalPredictions} predictions\n\n` +
`Daily BTC range prediction on Base → basebracket.vercel.app`;

const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

return (
<div className="space-y-3">
{/* Card Preview */}
<div className="bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 rounded-2xl p-6 text-white">
{/* Header */}
<div className="flex items-start justify-between mb-5">
<div>
<p className="text-blue-400 text-xs font-semibold tracking-widest mb-1">BRACKET</p>
<p className="text-white font-bold text-lg leading-tight">{username}</p>
{archetype && (
<p className="text-blue-300 text-xs mt-0.5">{ARCHETYPE_LABEL[archetype] || archetype}</p>
)}
</div>
<div className="text-right">
<p className="text-blue-300 text-xs mb-0.5">PR Score</p>
<p className="text-white font-black text-2xl">{formatPRScore(prScore)}</p>
<p className="text-blue-400 text-xs">{getPRLabel(prScore)}</p>
</div>
</div>

{/* Stats */}
<div className="grid grid-cols-2 gap-3 mb-5">
<div className="bg-white/10 rounded-xl p-3">
<p className="text-blue-200 text-xs mb-1">Total PnL</p>
<p className={`font-bold text-lg ${pnlPositive ? 'text-green-400' : 'text-red-400'}`}>
{pnlPositive ? '+' : ''}{formatUSDC(pnl)}
</p>
</div>
<div className="bg-white/10 rounded-xl p-3">
<p className="text-blue-200 text-xs mb-1">Win Rate</p>
<p className="font-bold text-lg text-white">{winRate}%</p>
</div>
<div className="bg-white/10 rounded-xl p-3">
<p className="text-blue-200 text-xs mb-1">Best Streak</p>
<p className="font-bold text-lg text-white">{bestStreak} days 🔥</p>
</div>
<div className="bg-white/10 rounded-xl p-3">
<p className="text-blue-200 text-xs mb-1">Predictions</p>
<p className="font-bold text-lg text-white">{totalPredictions}</p>
</div>
</div>

<p className="text-blue-400 text-xs text-center">basebracket.vercel.app · Level {level}</p>
</div>

{/* Share Button */}
<a
href={twitterUrl}
target="_blank"
rel="noopener noreferrer"
className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-900 transition-colors"
>
<Share2 className="w-4 h-4" />
Share on X
</a>
</div>
);}

// ─── Bet Card ────────────────────────────────────────────────────────────────
const { username, poolId, poolLabel, stakeAmount, payoutAmount, isWinner, prScore, level, date } = props;
const settled = isWinner !== undefined;

const shareText = settled
? isWinner
? `🏆 Called it! Pool ${poolLabel} (${POOL_NAMES[poolId]}) — ${formatUSDC(stakeAmount)} → ${formatUSDC(payoutAmount ?? 0)}\n\nPR Score: ${formatPRScore(prScore)} · @BracketPredict\nbasebracket.vercel.app`
: `Missed Pool ${poolLabel} today. PR Score: ${formatPRScore(prScore)} — back tomorrow.\n\n@BracketPredict · basebracket.vercel.app`
: `My prediction is in — Pool ${poolLabel} (${POOL_NAMES[poolId]}) · ${formatUSDC(stakeAmount)} staked.\n\nPR Score: ${formatPRScore(prScore)} · @BracketPredict\nbasebracket.vercel.app`;

const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

return (
<div className="space-y-3">
{/* Card Preview */}
<div className="bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 rounded-2xl p-6 text-white">
<div className="flex items-start justify-between mb-5">
<div>
<p className="text-blue-400 text-xs font-semibold tracking-widest mb-1">BRACKET</p>
<p className="text-white font-bold text-lg">{username}</p>
<p className="text-blue-300 text-xs">Lv. {level} · {getPRLabel(prScore)}</p>
</div>
<div className="text-right">
<p className="text-blue-300 text-xs mb-0.5">PR Score</p>
<p className="text-white font-black text-2xl">{formatPRScore(prScore)}</p>
</div>
</div>

<div className="bg-white/10 rounded-xl p-4 mb-4">
<p className="text-blue-200 text-xs mb-1">Pool {poolLabel} · {POOL_NAMES[poolId]}</p>
{settled ? (
isWinner ? (
<div className="flex items-center justify-between">
<p className="text-green-400 font-bold text-xl">🏆 WON</p>
<div className="text-right">
<p className="text-green-400 font-bold">{formatUSDC(payoutAmount ?? 0)}</p>
<p className="text-blue-300 text-xs">from {formatUSDC(stakeAmount)}</p>
</div>
</div>
) : (
<p className="text-red-400 font-bold text-xl">Missed this one.</p>
)
) : (
<div className="flex items-center justify-between">
<p className="text-white font-bold text-xl">{formatUSDC(stakeAmount)}</p>
<p className="text-blue-300 text-xs">staked</p>
</div>
)}
</div>

<p className="text-blue-400 text-xs text-center">
{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
{' · '}basebracket.vercel.app
</p>
</div>

{/* Share Button */}
<a
href={twitterUrl}
target="_blank"
rel="noopener noreferrer"
className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-900 transition-colors"
>
<Share2 className="w-4 h-4" />
Share on X
</a>
</div>
);
}

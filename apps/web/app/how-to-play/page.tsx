'use client';

import Link from 'next/link';
import { ArrowLeft, Trophy, Zap, Target, Users, Shield, TrendingUp, Star, Activity } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

export default function HowToPlayPage() {
return (
<div className="min-h-screen bg-white text-gray-900">

{/* Navbar */}
<nav className="border-b border-gray-100 px-6 py-4">
<div className="max-w-4xl mx-auto flex items-center justify-between">
<Link href="/" className="text-xl font-bold tracking-tight text-blue-600">
BRACKET
</Link>
<Link href="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
<ArrowLeft className="w-4 h-4" />
Back
</Link>
</div>
</nav>

<div className="max-w-4xl mx-auto px-6 py-16 space-y-20">

{/* Header */}
<div className="text-center">
<h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">How to Play</h1>
<p className="text-xl text-gray-500 max-w-2xl mx-auto">
Everything you need to know about Bracket — mechanics, scoring, jackpot, and fees.
</p>
</div>

{/* The Basics */}
<section>
<h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
<Target className="w-6 h-6 text-blue-600" />
The Basics
</h2>
<div className="space-y-4 text-gray-600 leading-relaxed">
<p>
Every day at <strong className="text-gray-900">00:00 UTC</strong>, a new BTC price prediction market opens.
Five price brackets — called pools — are generated based on BTC's recent volatility.
You pick the pool you think BTC will land in when the market closes at <strong className="text-gray-900">23:00 UTC</strong>.
</p>
<p>
At <strong className="text-gray-900">midnight UTC</strong>, Chainlink oracle reads the BTC/USD price on-chain.
If your pool wins, you split the entire prize pool with other winners — proportional to your stake.
If no one wins (or only one pool has bets), everyone gets a full refund.
</p>
</div>
<div className="grid md:grid-cols-3 gap-4 mt-8">
{[
{ step: '01', title: 'Pick a Pool', desc: 'Choose one of 5 BTC price ranges. Each pool has an estimated payout multiplier shown in real-time.' },
{ step: '02', title: 'Stake USDC', desc: 'Minimum bet is 5 USDC. No maximum unless total pool exceeds 10,000 USDC — then max is 5% of pool.' },
{ step: '03', title: 'Claim Winnings', desc: 'After settlement, winners claim their payout directly from the smart contract.' },
].map((item) => (
<div key={item.step} className="bg-gray-50 rounded-2xl p-6">
<span className="text-blue-600 font-bold text-sm">{item.step}</span>
<h3 className="font-semibold text-gray-900 mt-2 mb-2">{item.title}</h3>
<p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
</div>
))}
</div>
</section>

{/* The 5 Pools */}
<section>
<h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
<Zap className="w-6 h-6 text-blue-600" />
The 5 Pools
</h2>
<p className="text-gray-600 leading-relaxed mb-6">
Pool ranges are dynamically calculated each day using BTC's 7-day and 30-day realized volatility
plus the average true range (ATR). The goal is a <strong className="text-gray-900">10-20-30-20-10% probability distribution</strong> — Pool C is
the most likely outcome, Pool A and E are the long shots.
</p>
<div className="border border-gray-100 rounded-2xl overflow-hidden">
{[
{ pool: 'A', label: 'Extreme Bear', desc: 'BTC far below expected range', prob: '~10%', mult: 'Up to 11x', color: 'bg-blue-50' },
{ pool: 'B', label: 'Bearish', desc: 'BTC slightly below mid', prob: '~20%', mult: 'Up to 5x', color: 'bg-sky-50' },
{ pool: 'C', label: 'Neutral', desc: 'BTC within expected range', prob: '~30%', mult: 'Up to 3x', color: 'bg-indigo-50' },
{ pool: 'D', label: 'Bullish', desc: 'BTC slightly above mid', prob: '~20%', mult: 'Up to 5x', color: 'bg-violet-50' },
{ pool: 'E', label: 'Extreme Bull', desc: 'BTC far above expected range', prob: '~10%', mult: 'Up to 11x', color: 'bg-purple-50' },
].map ((item) => (
<div key={item.pool} className={`flex items-center justify-between px-6 py-4 ${item.color} border-b border-white last:border-0`}>
<div className="flex items-center gap-4">
<span className="font-bold text-gray-700 w-6">{item.pool}</span>
<div>
<p className="font-medium text-gray-900 text-sm">{item.label}</p>
<p className="text-xs text-gray-500">{item.desc}</p>
</div>
</div>
<div className="text-right">
<p className="text-sm font-semibold text-gray-900">{item.mult}</p>
<p className="text-xs text-gray-400">{item.prob} probability</p>
</div>
</div>
))}
</div>
<p className="text-sm text-gray-400 mt-3">
* Multipliers are estimated. Final payout depends on total stakes at close.
</p>
</section>

{/* Parimutuel */}
<section>
<h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
<TrendingUp className="w-6 h-6 text-blue-600" />
Player vs. Player — How Payouts Work
</h2>
<div className="space-y-5 text-gray-600 leading-relaxed">
<p>
Bracket uses a <strong className="text-gray-900">parimutuel system</strong>. There is no house, no AMM, no liquidity provider on the other side of your bet.
You're playing against other participants — winners take the losers' stakes.
</p>
<p>
This is fundamentally different from prediction markets that use AMMs (like Polymarket's CLOB or Augur's liquidity pools).
In those systems, prices are quoted by market makers who need to be compensated for risk.
In Bracket, there are no market makers. The "price" of a pool is purely determined by how much everyone has staked into it.
</p>

<div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-2">
<p className="font-mono text-sm text-gray-700">Net Pool = Total Stakes × (1 - 5% fee)</p>
<p className="font-mono text-sm text-gray-700">Your Payout = Net Pool × (Your Stake / Winning Pool Total)</p>
</div>

<p>
What this means in practice: if 80% of all stakes go into Pool C and you're in Pool A — your effective odds are much higher.
The crowd is your counterparty. Bet against them and win, and they fund your payout.
</p>

<div className="grid md:grid-cols-3 gap-4 mt-2">
{[
{
title: 'No house edge on outcomes',
desc: 'The protocol takes 5% upfront. After that, every dollar goes to winners. The house doesn\'t bet against you.',
},
{
title: 'No liquidity needed',
desc: 'There\'s no AMM to seed, no order book to maintain. Any amount of volume works — the pool self-balances.',
},
{
title: 'Odds are crowd-driven',
desc: 'Pool C always has the most bets (safe play). Pool A and E are contrarian. Your multiplier reflects actual crowd sentiment, not a market maker\'s model.',
},
].map((item) => (
<div key={item.title} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
<p className="font-semibold text-gray-900 text-sm mb-2">{item.title}</p>
<p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
</div>
))}
</div>

<div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
<p className="text-blue-800 text-sm font-medium mb-1">Refund Condition</p>
<p className="text-blue-700 text-sm">
If fewer than 2 pools receive bets — all bets are refunded in full. No fee is taken.
A parimutuel market needs at least two competing pools to function fairly.
</p>
</div>
</div>
</section>

{/* PR Score */}
<section>
<h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
<Star className="w-6 h-6 text-blue-600" />
PR Score — Predictor Rating
</h2>
<p className="text-gray-600 leading-relaxed mb-6">
PR Score is your skill rating, calculated after every settlement based on
<strong className="text-gray-900"> 4 components</strong>. Max theoretical score is 3,000+.
</p>

<div className="space-y-3">
{[
{
label: 'Accuracy',
weight: '40%',
max: '1,200 pts',
desc: 'Win Rate × 1200. Straightforward — higher win rate, higher score.',
},
{
label: 'Difficulty / Surprise Factor',
weight: '30%',
max: '900 pts',
desc: 'Winning in a low-participation pool gives more points. Win Pool A when only 5% of bets go there = 20× surprise factor. Win Pool C with 40% ofbets = 2.5× factor. Losing gives 0.',
},
{
label: 'Consistency',
weight: '20%',
max: '600 pts',
desc: 'Based on total predictions made — maxes out at 100 predictions. Like Glicko: more data = more valid score. Prevents new users from topping leaderboard on a lucky streak.',
},
{
label: 'Contrarian Success',
weight: '10%',
max: '300 pts',
desc: 'Win rate specifically in Pool A and E. Consistently winning in extreme pools gives a dedicated bonus on top of the difficulty score.',
},
].map((item) => (
<div key={item.label} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
<div className="flex items-center justify-between mb-2">
<p className="font-semibold text-gray-900">{item.label}</p>
<div className="flex items-center gap-2">
<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{item.weight}</span>
<span className="text-xs text-gray-400">max {item.max}</span>
</div>
</div>
<p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
</div>
))}
</div>

<div className="bg-amber-50 border border-amber-100 rounded-xl p-5 mt-4">
<p className="text-amber-800 text-sm font-medium mb-1">Key insight</p>
<p className="text-amber-700 text-sm">
A player who always bets Pool C and wins 60% of the time can be outranked by someone
who bets Pool A/E, wins 40% of the time, but consistently picks low-participation pools.
Skill + courage beats pure win rate.
</p>
</div>

{/* XP */}
<div className="mt-8">
<h3 className="text-lg font-bold text-gray-900 mb-4">XP & Levels</h3>
<p className="text-gray-600 text-sm mb-4">XP is separate from PR Score — it tracks activity and milestones.</p>
<div className="grid md:grid-cols-2 gap-3">
{[
{ action: 'Any prediction (win or lose)', xp: '+10 XP' },
{ action: 'Winning a market', xp: '+50 XP' },
{ action: 'Winning in Pool A or E', xp: '+30 XP bonus' },
{ action: 'Winning in pool < 20% participation', xp: '+20 XP bonus' },
{ action: 'Win streak 3+', xp: '+5 XP per streak (max +50)' },
].map((item) => (
<div key={item.action} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
<p className="text-sm text-gray-600">{item.action}</p>
<span className="text-sm font-semibold text-blue-600 ml-3 flex-shrink-0">{item.xp}</span>
</div>
))}
</div>
</div>

{/* Archetypes */}
<div className="mt-8">
<h3 className="text-lg font-bold text-gray-900 mb-4">Archetypes</h3>
<div className="grid md:grid-cols-2 gap-3">
{[
{ title: 'Sharpshooter', desc: 'High win rate, consistent predictions. Trusts the data.' },
{ title: 'Contrarian', desc: 'Loves Pool A and E. Bets against the crowd and sometimes wins big.' },
{ title: 'Consensus', desc: 'Always bets with the crowd. Safe plays, lower multipliers.' },
{ title: 'Degen', desc: 'Random picks, high variance. Somehow still here.' },
].map((item) => (
<div key={item.title} className="border border-gray-100 rounded-xl p-5">
<p className="font-semibold text-gray-900">{item.title}</p>
<p className="text-sm text-gray-500 mt-1">{item.desc}</p>
</div>
))}
</div>
</div>
</section>

{/* Fees */}
<section>
<h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
<Shield className="w-6 h-6 text-blue-600" />
Fee Structure
</h2>
<p className="text-gray-600 leading-relaxed mb-6">
A total of <strong className="text-gray-900">5% protocol fee</strong> is deducted from the prize pool at settlement.
Only applies on normal settlement — refunds are fee-free.
</p>
<div className="grid md:grid-cols-2 gap-4">
<div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
<p className="text-2xl font-bold text-gray-900">2.5%</p>
<p className="font-medium text-gray-700 mt-1">Dev Treasury</p>
<p className="text-sm text-gray-500 mt-2">
Funds protocol maintenance, infrastructure, and ecosystem growth.
</p>
</div>
<div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
<p className="text-2xl font-bold text-gray-900">2.5%</p>
<p className="font-medium text-gray-700 mt-1">Jackpot Treasury</p>
<p className="text-sm text-gray-500 mt-2">
Accumulated each market. Distributed monthly to eligible users.
</p>
</div>
</div>
</section>

{/* Jackpot */}
<section>
<h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
<Trophy className="w-6 h-6 text-blue-600" />
Monthly Jackpot
</h2><div className="space-y-4 text-gray-600 leading-relaxed">
<p>
Every month, 2.5% of all market fees accumulate into a jackpot pool.
On the <strong className="text-gray-900">1st of each month at 12:00 UTC</strong>, the jackpot is distributed across 4 categories.
</p>
<p>
Eligibility: account at least <strong className="text-gray-900">30 days old</strong> + at least <strong className="text-gray-900">20 settled predictions</strong> this season.
</p>
</div>
<div className="mt-6 space-y-3">
{[
{ pct: '50%', category: 'Community Draw', icon: Users, desc: 'Random draw from all eligible users. Every qualifying participant has an equal chance.' },
{ pct: '25%', category: 'Skill Jackpot', icon: Star, desc: 'Top 3 PR Score holders this season. Random draw among the top 3.' },
{ pct: '15%', category: 'Activity Jackpot', icon: Activity, desc: 'User with the longest active prediction streak this season.' },
{ pct: '10%', category: 'Contrarian Jackpot', icon: Zap, desc: 'Highest win rate in Pool A or E, minimum 10 contrarian predictions.' },
].map((item) => (
<div key={item.category} className="flex items-start gap-4 bg-gray-50 rounded-xl p-5 border border-gray-100">
<span className="text-2xl font-bold text-blue-600 flex-shrink-0">{item.pct}</span>
<div>
<div className="flex items-center gap-2 mb-1">
<item.icon className="w-4 h-4 text-gray-500" />
<p className="font-semibold text-gray-900">{item.category}</p>
</div>
<p className="text-sm text-gray-500">{item.desc}</p>
</div>
</div>
))}
</div>
</section>

{/* On-Chain */}
<section>
<h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
<Shield className="w-6 h-6 text-blue-600" />
On-Chain & Transparent
</h2>
<div className="space-y-4 text-gray-600 leading-relaxed">
<p>
Bracket runs on <strong className="text-gray-900">Base</strong> (Ethereum L2).
All bets, settlements, and payouts happen via a <strong className="text-gray-900">smart contract</strong>.
Price settlement uses <strong className="text-gray-900">Chainlink BTC/USD oracle</strong>.
</p>
<p>
Settlement is <strong className="text-gray-900">permissionless</strong> — anyone can trigger it after market close.
If our backend fails, you or anyone can settle the market manually via the contract.
</p>
<div className="grid md:grid-cols-2 gap-4 mt-4">
<div className="border border-gray-100 rounded-xl p-5">
<p className="text-xs text-gray-400 mb-1">USDC (Base Mainnet)</p>
<p className="font-mono text-xs text-gray-600 break-all">0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913</p>
</div>
<div className="border border-gray-100 rounded-xl p-5">
<p className="text-xs text-gray-400 mb-1">Chainlink BTC/USD (Base)</p>
<p className="font-mono text-xs text-gray-600 break-all">0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F</p>
</div>
</div>
</div>
</section>

{/* CTA */}
<section className="text-center py-8">
<h2 className="text-2xl font-bold mb-4">Ready to Play?</h2>
<p className="text-gray-500 mb-8">New market opens every day at midnight UTC.</p>
<Link
href="/dashboard"
className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors"
>
Go to Today's Market
</Link>
</section>

</div>

<Footer />
</div>
);
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Target, Zap, Trophy, ArrowRight } from 'lucide-react';

export default function HowToPlayModal() {
const [open, setOpen] = useState(false);

useEffect(() => {
const seen = sessionStorage.getItem('htp_seen');
if (!seen) {
const timer = setTimeout(() => {
setOpen(true);
sessionStorage.setItem('htp_seen', '1');
}, 1500);
return () => clearTimeout(timer);
}
}, []);

if (!open) return null;
return (
<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
<div
className="absolute inset-0 bg-black/40 backdrop-blur-sm"
onClick={() => setOpen(false)}
/>
<div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
<button
onClick={() => setOpen(false)}
className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
>
<X className="w-5 h-5" />
</button>

<div className="mb-5">
<span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
<span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
New here?
</span>
<h2 className="text-xl font-bold text-gray-900">How Bracket Works</h2>
<p className="text-sm text-gray-500 mt-1">
Daily BTC price prediction. Pick your pool, beat the crowd.
</p>
</div>

<div className="space-y-3 mb-5">
{[
{ icon: Target, title: 'Pick a Pool', desc: '5 BTC price ranges daily. Pick where BTC closes.', color: 'bg-blue-50 text-blue-600' },
{ icon: Zap, title: 'Stake USDC', desc: 'Min 5 USDC. Losers fund the winners — no house edge.', color: 'bg-indigo-50 text-indigo-600' },
{ icon: Trophy, title: 'Claim & Win', desc: 'Oracle settles at midnight UTC. Winners split the pool.', color: 'bg-violet-50 text-violet-600' },
].map((item) => (
<div key={item.title} className="flex items-start gap-3">
<div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
<item.icon className="w-4 h-4" />
</div>
<div>
<p className="text-sm font-semibold text-gray-900">{item.title}</p>
<p className="text-xs text-gray-500">{item.desc}</p>
</div>
</div>
))}
</div>

<div className="bg-gray-50 rounded-xl p-3 mb-5 text-xs text-gray-500">
<span className="font-medium text-gray-700">Fees: </span>
2.5% dev + 2.5% monthly jackpot pool. Only taken on normal settlement.
</div>

<div className="flex gap-3">
<Link
href="/how-to-play"
onClick={() => setOpen(false)}
className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors"
>
Full Guide
<ArrowRight className="w-4 h-4" />
</Link>
<button
onClick={() => setOpen(false)}
className="ml-auto bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
>
Start Predicting
</button>
</div>
</div>
</div>
);
}

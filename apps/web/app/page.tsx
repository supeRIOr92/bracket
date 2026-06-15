'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, TrendingUp, Users, Zap, Shield, Trophy } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import HowToPlayModal from '@/components/ui/HowToPlayModal'; 
interface PoolDisplay {
  label: string;
  range: string;
  pct: string;
  multiplier: string;
  color: string;
}
export default function LandingPage() {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();

useEffect(() => {
if (ready && authenticated) {
router.push('/dashboard');
}
}, [ready, authenticated, router]);


  const handleCTA = () => {
    if (authenticated) {
      router.push('/dashboard');
    } else {
      login();
    }
  };
  const { data: jackpot } = useQuery({
    queryKey: ['landing-jackpot'],
    queryFn: async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jackpot/current`);
        if (!res.ok) return null;
        return res.json();
      } catch { return null; }
    },
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['landing-leaderboard'],
    queryFn: async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/leaderboard?category=pr_score&limit=5`);
        if (!res.ok) return [];
        return res.json();
      } catch { return []; }
    },
  });

  const { data: season } = useQuery({
    queryKey: ['landing-season'],
    queryFn: async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/seasons/current`);
        if (!res.ok) return null;
        return res.json();
      } catch { return null; }
    },
  });

    const { data: liveMarket } = useQuery({
    queryKey: ['landing-market'],
    queryFn: async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/markets/today`);
        if (!res.ok) return null;
        return res.json();
      } catch { return null; }
    },
    refetchInterval: 30_000,
  });

  const { data: livePools } = useQuery({queryKey: ['landing-pools', liveMarket?.id],
    queryFn: async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/markets/${liveMarket!.id}/pools`);
        if (!res.ok) return null;
        return res.json();
      } catch { return null; }
    },
    enabled: !!liveMarket?.id,
    refetchInterval: 15_000,
  });
  
      const { data: platformStats } = useQuery({
      queryKey: ['platform-stats'],
      queryFn: async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/markets/stats/platform`);
          if (!res.ok) return null;
          return res.json();
        } catch { return null; }
      },
      staleTime: 60_000,
    });

  const pools: PoolDisplay[] = livePools?.length ? livePools.map((p: any, i: number) => ({
    label: p.label,
    range: p.range,
    pct: `${p.participationPct}%`,
    multiplier: p.estimatedMultiplier !== '—' ? `${p.estimatedMultiplier}x` : '—',
    color: [
      'border-blue-200 bg-blue-50',
      'border-sky-200 bg-sky-50',
      'border-indigo-200 bg-indigo-50',
      'border-violet-200 bg-violet-50',
      'border-purple-200 bg-purple-50',
    ][i],
  })) : [
    { label: 'A', range: '< $101,500',           pct: '8%',  multiplier: '11.4x', color: 'border-blue-200 bg-blue-50'   },
    { label: 'B', range: '$101,500 - $103,000',   pct: '18%', multiplier: '5.1x',  color: 'border-sky-200 bg-sky-50'     },
    { label: 'C', range: '$103,000 - $105,000',   pct: '46%', multiplier: '2.0x',  color: 'border-indigo-200 bg-indigo-50' },
    { label: 'D', range: '$105,000 - $106,500',   pct: '20%', multiplier: '4.6x',  color: 'border-violet-200 bg-violet-50' },
    { label: 'E', range: '> $106,500',            pct: '8%',  multiplier: '11.4x', color: 'border-purple-200 bg-purple-50' },
  ];

  const steps = [
    {
      step: '01',
      title: 'Pick Your Range',
      desc: 'Every day, 5 BTC price brackets are generated based on volatility. Pick the bracket you think BTC will land in.',
    },
    {
      step: '02',
      title: 'Stake USDC',
      desc: 'Place your bet in USDC. Minimum 5 USDC. The smaller your pool — the bigger your potential payout.',
    },
    {
      step: '03',
      title: 'Claim Your Win',
      desc: 'At midnight UTC, Chainlink oracle reads BTC price. Winners split the entire pool. Losers fund the winners.',
    },
  ];

  const features = [
    {
      icon: TrendingUp,
      title: 'PR Score — Skill Matters',
      desc: 'Your Predictor Rating tracks accuracy, consistency, and contrarian bets. Win in low-participation pools for bigger score gains.',
    },
    {
      icon: Zap,
      title: 'Parimutuel — Honest Odds',
      desc: 'No house takes your money. The pool is split proportionally among winners. Estimated payout updates in real-time.',
    },
    {
      icon: Users,
      title: 'Social Layer',
      desc: 'Follow top predictors, track their archetype — Sharpshooter, Contrarian, Consensus. Your picks are hidden until betting closes.',
    },
    {
      icon: Shield,
      title: 'On-chain and Transparent',
      desc: 'Smart contract on Base. Chainlink oracle for settlement. Permissionless — anyone can trigger settlement after deadline.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <HowToPlayModal />
        {/* Navbar */}
          <nav className="border-b border-gray-100 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-blue-600">
        BRACKET
      </span>
      <div className="flex items-center gap-4">
        <Link href="/how-to-play" className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
          How to Play
        </Link>
      <button
      onClick={handleCTA}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
      {authenticated ? 'Go to App' : 'Launch App'}
      </button>
      </div>
      </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Live on Base
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
          Predict the Market.
          <br />
          <span className="text-blue-600">Outsmart the Crowd.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Daily BTC price bracket prediction. Pick your bracket, stake USDC,
          Beat the crowd. Your skill — not your wallet size — determines your edge.

        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleCTA}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors w-full sm:w-auto justify-center"
          >
            Start Predicting
            <ArrowRight className="w-5 h-5" />
          </button>
          <a
            href="#how-it-works"
            className="text-gray-500 hover:text-gray-900 transition-colors text-lg font-medium"
          >
            How it works
          </a>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-gray-100 bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-3xl font-bold text-gray-900">
              {platformStats ? `$${Number(platformStats.totalVolume).toLocaleString()}` : 'Daily'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {platformStats ? 'Total Volume' : 'New Market'}
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">
              {platformStats ? Number(platformStats.totalPredictions).toLocaleString() : '5 Pools'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {platformStats ? 'Predictions' : 'Per Market'}
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">
              {platformStats ? Number(platformStats.totalUsers).toLocaleString() : 'USDC'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {platformStats ? 'Users' : 'Always'}
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
        <p className="text-gray-500 text-center mb-16 max-w-xl mx-auto">
          No bandar. No house edge. Pure PvP — your payout comes from other players.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((item) => (
            <div key={item.step} className="bg-gray-50 rounded-2xl p-8">
              <span className="text-blue-600 font-bold text-sm">{item.step}</span>
              <h3 className="text-xl font-semibold mt-2 mb-3">{item.title}</h3>
              <p className="text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">Built Different</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white rounded-2xl p-8 border border-gray-100">
                <feature.icon className="w-8 h-8 text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pool Example */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">
          {"Today's Market"}
        </h2>
        <p className="text-gray-500 text-center mb-12">
          {liveMarket
            ? `BTC @ $${liveMarket.btc_price_at_open?.toLocaleString() ?? '—'} — Live market`
            : 'BTC range prediction — Pick your pool'}
        </p>
        <div className="max-w-2xl mx-auto space-y-3">
          {pools.map((pool) => (
            <div
              key={pool.label}
              className={`flex items-center justify-between border rounded-xl px-5 py-4 ${pool.color}`}
            >
              <div className="flex items-center gap-4">
                <span className="font-bold text-gray-700 w-6">{pool.label}</span>
                <span className="text-gray-600 text-sm">{pool.range}</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-gray-500">{pool.pct} of players</span>
                <span className="font-semibold text-gray-900">{pool.multiplier}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Jackpot Banner */}
      {jackpot && (
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 py-12">
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Trophy className="w-10 h-10 text-white" />
              <div>
                <p className="text-blue-100 text-sm font-medium">Monthly Jackpot</p>
                <p className="text-white text-3xl font-bold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(parseFloat(jackpot.amount || jackpot.pool_size || '0'))} USDC
                </p>
              </div>
            </div>
            <p className="text-blue-100 text-sm max-w-xs text-right hidden md:block">
              Top predictors of the week share the jackpot pool. Keep your streak alive to qualify.
            </p>
          </div>
        </section>
      )}

      {/* Leaderboard Preview */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Top Predictors</h2>
          <a href="/leaderboard" className="text-blue-600 text-sm font-medium hover:underline">View Full Leaderboard →</a>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {!leaderboard?.length ? (
            <p className="text-center text-gray-400 py-12 text-sm">No data yet. Be the first to predict.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {leaderboard.slice(0, 5).map((user: any, i: number) => (
                <div key={user.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <span className={`w-8 text-sm font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-300'}`}>#{i + 1}</span>
                    <span className="font-medium text-gray-900">{user.username || `${user.wallet_address?.slice(0, 6)}...`}</span>
                  </div>
                  <span className="font-bold text-blue-600">{user.pr_score} PR</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Season Progress */}
      {season && (
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{season.name || 'Current Season'}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {season.end_date ? `Ends ${new Date(season.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : 'Season in progress'}
                </p>
              </div>
              {season.end_date && (
                <span className="text-blue-600 font-bold text-sm">
                  {Math.max(0, Math.ceil((new Date(season.end_date).getTime() - Date.now()) / 86400000))} days left
                </span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${(() => {
                const start = season.start_date ? new Date(season.start_date).getTime() : 0;
                const end = season.end_date ? new Date(season.end_date).getTime() : 0;
                const now = Date.now();
                if (!start || !end || end <= start) return 0;
                return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
              })()}%` }} />
            </div>
          </div>
        </section>
      )}

      {/* CTA Bottom */}
      <section className="bg-blue-600 py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Outsmart the Crowd?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            New market opens every day at midnight UTC.
          </p>
          <button
            onClick={handleCTA}
            className="bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            {authenticated ? 'Go to Dashboard' : 'Get Started — Free'}
          </button>
        </div>
      </section>

            <Footer />

    </div>
  );
}

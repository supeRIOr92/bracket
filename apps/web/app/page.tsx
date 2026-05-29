'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowRight, TrendingUp, Users, Zap, Shield } from 'lucide-react';

export default function LandingPage() {
  const { login, authenticated } = usePrivy();
  const router = useRouter();

useEffect(() => {
if (authenticated) {
router.push('/dashboard');
}
}, [authenticated, router]);


  const handleCTA = () => {
    if (authenticated) {
      router.push('/dashboard');
    } else {
      login();
    }
  };

  const pools = [
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
      desc: 'Every day, 5 BTC price ranges are generated based on volatility. Pick the pool you think BTC will land in.',
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

      {/* Navbar */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-blue-600">
            BRACKET
          </span>
          <button
            onClick={handleCTA}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {authenticated ? 'Go to App' : 'Launch App'}
          </button>
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
          Daily BTC price range prediction. Pick your pool, stake USDC,
          beat the crowd. Your skill — not your wallet size — determines your edge.
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
            <p className="text-3xl font-bold text-gray-900">Daily</p>
            <p className="text-sm text-gray-500 mt-1">New Market</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">5 Pools</p>
            <p className="text-sm text-gray-500 mt-1">Per Market</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">USDC</p>
            <p className="text-sm text-gray-500 mt-1">Always</p>
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
          {"Today's Market — Example"}
        </h2>
        <p className="text-gray-500 text-center mb-12">
          BTC @ $104,000 — Pick your range
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

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="font-bold text-blue-600">BRACKET</span>
          <p className="text-gray-400 text-sm">
            Built on Base. Powered by Chainlink.
          </p>
        </div>
      </footer>

    </div>
  );
}

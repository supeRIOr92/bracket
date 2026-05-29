'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import { jackpotApi } from '@/lib/api';
import { formatUSDC } from '@/lib/utils';
import { Trophy, Users, Zap, Target, CheckCircle, XCircle } from 'lucide-react';

const CATEGORIES = [
  { key: 'community', label: 'Community Jackpot', pct: '50%', icon: Users, desc: 'Random draw — all eligible users' },
  { key: 'skill', label: 'Skill Jackpot', pct: '25%', icon: Trophy, desc: 'Top 3 PR Score this season' },
  { key: 'activity', label: 'Activity Jackpot', pct: '15%', icon: Zap, desc: 'Longest current streak' },
  { key: 'contrarian', label: 'Contrarian Jackpot', pct: '10%', icon: Target, desc: 'Highest win rate in Pool A/E (min. 10 predictions)' },
];

export default function JackpotPage() {
  const { user } = usePrivy();

  const { data: jackpot, isLoading } = useQuery({
    queryKey: ['jackpot'],
    queryFn: async () => {
      const res = await jackpotApi.getCurrent();
      return res.data;
    },
  });

  const { data: eligibility } = useQuery({
    queryKey: ['jackpot', 'eligibility'],
    queryFn: async () => {
      const res = await jackpotApi.checkEligibility();
      return res.data;
    },
    enabled: !!user,
  });

  const { data: history } = useQuery({
    queryKey: ['jackpot', 'history'],
    queryFn: async () => {
      const res = await jackpotApi.getHistory();
      return res.data;
    },
  });

  const totalPool = parseFloat(jackpot?.totalPool || '0');

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Weekly Jackpot</h1>
        <p className="text-gray-500 mt-1">Drawn every Monday at 12:00 UTC</p>
      </div>

      {/* Prize Pool */}
      <div className="bg-blue-600 rounded-2xl p-8 text-center text-white">
        <p className="text-blue-200 text-sm font-medium mb-2">Current Prize Pool</p>
        <p className="text-5xl font-bold mb-1">
          {isLoading ? '—' : formatUSDC(totalPool)}
        </p>
        <p className="text-blue-200 text-sm">
          {jackpot?.eligibleUsers || 0} eligible participants
        </p>
      </div>

      {/* Eligibility */}
      {user && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Your Eligibility</h2>

          {!eligibility ? (
            <div className="flex items-center justify-center h-16">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {eligibility.requirements.accountAge.met
                      ? <CheckCircle className="w-4 h-4 text-green-500" />
                      : <XCircle className="w-4 h-4 text-red-400" />}
                    <span className="text-sm text-gray-600">Account age ≥ 30 days</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {eligibility.requirements.accountAge.current} / 30 days
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {eligibility.requirements.predictions.met
                      ? <CheckCircle className="w-4 h-4 text-green-500" />
                      : <XCircle className="w-4 h-4 text-red-400" />}
                    <span className="text-sm text-gray-600">Settled predictions ≥ 20</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {eligibility.requirements.predictions.current} / 20
                  </span>
                </div>
              </div>

              <div className={`rounded-xl px-4 py-3 text-sm font-medium text-center ${
                eligibility.isEligible
                  ? 'bg-green-50 text-green-700'
                  : 'bg-gray-50 text-gray-500'
              }`}>
                {eligibility.isEligible
                  ? '✓ You are eligible for this week\'s draw'
                  : 'Complete requirements to join the jackpot'}
              </div>
            </>
          )}
        </div>
      )}

      {/* Prize Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Prize Breakdown</h2>
        <div className="space-y-3">
          {CATEGORIES.map((cat) => (
            <div key={cat.key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                  <cat.icon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{cat.label}</p>
                  <p className="text-xs text-gray-400">{cat.desc}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-blue-600">{cat.pct}</p>
                <p className="text-xs text-gray-400">
                  {formatUSDC(totalPool * parseFloat(cat.pct) / 100)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Past Winners</h2>
        {!history?.length ? (
          <p className="text-gray-400 text-sm text-center py-8">No draws yet.</p>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 10).map((draw: any) => (
              <div key={draw.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {draw.category} Jackpot
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(draw.draw_date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>
                <p className="font-semibold text-gray-900">
                  {formatUSDC(parseFloat(draw.prize_amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

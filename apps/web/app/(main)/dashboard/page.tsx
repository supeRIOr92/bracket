'use client';

import MarketCountdown from '@/components/ui/MarketCountdown';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPublicClient, createWalletClient, custom, http, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { useTodayMarket, useMarketPools } from '@/hooks/useMarket';
import { formatUSDC, formatPRScore, getPRLabel, formatAddress } from '@/lib/utils';
import { POOL_COLORS, USDC_ADDRESS, CONTRACT_ADDRESS } from '@/lib/constants';
import { Clock, TrendingUp, Users, X, AlertCircle, CheckCircle, Zap, Target, Award, Share2 } from 'lucide-react';
import LiveActivity from '@/components/market/LiveActivity';
import LiveComments from '@/components/market/LiveComments';
import ShareCard from '@/components/market/ShareCard';
import { predictionsApi, usersApi, marketsApi } from '@/lib/api';

const POOL_NAMES: Record<number, string> = {
  1: 'Extreme Bear',
  2: 'Bearish',
  3: 'Neutral',
  4: 'Bullish',
  5: 'Extreme Bull',
};

const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const MARKET_ABI = [
  {
    name: 'placeBet',
    type: 'function',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'poolId', type: 'uint8' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'claim',
    type: 'function',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

type BetStep = 'idle' | 'approving' | 'betting' | 'recording' | 'success' | 'error';
type ClaimStep = 'idle' | 'claiming' | 'recording' | 'success' | 'error';

export default function DashboardPage() {
  const { user: privyUser } = usePrivy();
  const { wallets } = useWallets();
  const [token, setToken] = useState<string | null>(null);
  const { data: market, isLoading, error } = useTodayMarket();
  const { data: pools } = useMarketPools(market?.id);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<BetStep>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [txHash, setTxHash] = useState('');

  const [claimStep, setClaimStep] = useState<ClaimStep>('idle');
  const [claimError, setClaimError] = useState('');
  const [showShareCard, setShowShareCard] = useState(false);
  const [showWinShareCard, setShowWinShareCard] = useState(false);

  useEffect(() => {
  const t = localStorage.getItem('bracket_token');
  setToken(t);

  const onStorage = () => setToken(localStorage.getItem('bracket_token'));
    window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Fetch user profile for stats
  const walletAddress = wallets[0]?.address?.toLowerCase();
  const { data: userProfile } = useQuery({
    queryKey: ['profile', walletAddress],
    queryFn: async () => (await usersApi.getProfileByAddress(walletAddress!)).data,
    enabled: !!walletAddress,
  });

  // Fetch pending claims
  const { data: yesterdayData } = useQuery({
    queryKey: ['yesterday-winners'],
    queryFn: async () => (await marketsApi.getYesterdayWinners()).data,
    staleTime: 5 * 60 * 1000,
  });
  const { data: claimStatus, refetch: refetchClaim } = useQuery({
    queryKey: ['claim-status', market?.id, walletAddress],
    queryFn: async () => (await predictionsApi.getClaimStatus(market!.id)).data,
    enabled: !!market?.id && !!walletAddress,
  });

  const isOpen = market?.status === 'open';
  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum >= 5;
  const totalPoolNum = parseFloat(market?.total_stake || '0');
  const maxBet = totalPoolNum >= 10000 ? totalPoolNum * 0.05 : null;
  const exceedsMax = maxBet !== null && amountNum > maxBet;
  const canBet = isValidAmount && !exceedsMax;
  const stats = userProfile?.user_stats;

  const handleSelectPool = (poolId: number) => {
    if (!isOpen) return;
    setSelectedPool(poolId);
    setModalOpen(true);
    setStep('idle');
    setErrorMsg('');
    setTxHash('');
    setAmount('');
  };

const handleCloseModal = () => {
if (step === 'approving' || step === 'betting' || step === 'recording') return;
setModalOpen(false);
setSelectedPool(null);
setAmount('');
setStep('idle');
setErrorMsg('');
setShowShareCard(false);
};

  const handlePlaceBet = async () => {
    if (!selectedPool || !canBet || !market) return;
    const wallet = wallets[0];
    if (!wallet) { setErrorMsg('No wallet connected'); setStep('error'); return; }

    try {
      setStep('approving');
      setErrorMsg('');
      const provider = await wallet.getEthereumProvider();
      const walletClient = createWalletClient({ chain: base, transport: custom(provider) });
      const publicClient = createPublicClient({ chain: base, transport: http() });
      const address = wallet.address as `0x${string}`;
      const amountInUnits = parseUnits(amount, 6);

      const allowance = await publicClient.readContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: USDC_ABI,
        functionName: 'allowance',
        args: [address, CONTRACT_ADDRESS],
      });

      if (allowance < amountInUnits) {
        const approveTx = await walletClient.writeContract({
          address: USDC_ADDRESS as `0x${string}`,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS, amountInUnits],
          account: address,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
      }

      setStep('betting');
      const betTx = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: MARKET_ABI,
        functionName: 'placeBet',
        args: [BigInt(market.chain_market_id), selectedPool, amountInUnits],
        account: address,
      });
      await publicClient.waitForTransactionReceipt({ hash: betTx });
      setTxHash(betTx);

      setStep('recording');
      await predictionsApi.record({
        marketId: market.id,
        poolId: selectedPool,
        stakeAmount: amountNum,
        txHash: betTx,
      });

      setStep('success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Transaction failed');
      setStep('error');
    }
  };

  const handleClaim = async () => {
    if (!market || !claimStatus?.canClaim) return;
    const wallet = wallets[0];
    if (!wallet) { setClaimError('No wallet connected'); setClaimStep('error'); return; }

    try {
      setClaimStep('claiming');
      setClaimError('');
      const provider = await wallet.getEthereumProvider();
      const walletClient = createWalletClient({ chain: base, transport: custom(provider) });
      const publicClient = createPublicClient({ chain: base, transport: http() });
      const address = wallet.address as `0x${string}`;

      const claimTx = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: MARKET_ABI,
        functionName: 'claim',
        args: [BigInt(market.chain_market_id)],
        account: address,
      });
      await publicClient.waitForTransactionReceipt({ hash: claimTx });

      setClaimStep('recording');
      await predictionsApi.recordClaim(market.id, claimTx);

      setClaimStep('success');
      refetchClaim();
    } catch (err: any) {
      setClaimError(err?.message || 'Claim failed');
      setClaimStep('error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="text-4xl">₿</div>
        <h2 className="text-xl font-bold text-gray-900">No active market today</h2>
        <p className="text-gray-400 text-sm">A new market opens every day at 00:00 UTC</p>
        <MarketCountdown />
      </div>
    );
  }

  const closeTimeRaw = market.close_at ? new Date(market.close_at) : null;
  const closeTime = closeTimeRaw && !isNaN(closeTimeRaw.getTime())
    ? closeTimeRaw.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
    : '—';

  const defaultPools = [
    { id: 1, label: 'A', range: `< $${market.pool_a_upper}`, stake: market.pool_a_stake, participationPct: market.pool_a_pct, estimatedMultiplier: '—' },
    { id: 2, label: 'B', range: `$${market.pool_a_upper} – $${market.pool_b_upper}`, stake: market.pool_b_stake, participationPct: market.pool_b_pct, estimatedMultiplier: '—' },
    { id: 3, label: 'C', range: `$${market.pool_b_upper} – $${market.pool_c_upper}`, stake: market.pool_c_stake, participationPct: market.pool_c_pct, estimatedMultiplier: '—' },
    { id: 4, label: 'D', range: `$${market.pool_c_upper} – $${market.pool_d_upper}`, stake: market.pool_d_stake, participationPct: market.pool_d_pct, estimatedMultiplier: '—' },
    { id: 5, label: 'E', range: `>= $${market.pool_d_upper}`, stake: market.pool_e_stake, participationPct: market.pool_e_pct, estimatedMultiplier: '—' },
  ];

  const displayPools = pools || defaultPools;
  const selectedPoolData = displayPools.find((p: any) => p.id === selectedPool);
  const winRate = stats && stats.total_predictions > 0
    ? ((stats.total_wins / stats.total_predictions) * 100).toFixed(1)
    : '0.0';
  const xpToNextLevel = stats ? ((stats.level) * 1000) : 1000;
  const xpProgress = stats ? Math.min((stats.xp % 1000) / 10, 100) : 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{"Today's Market"}</h1>
          <p className="text-gray-500 mt-1">
            {new Date(market.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          isOpen ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          {isOpen ? 'Betting Open' : market.status.charAt(0).toUpperCase() + market.status.slice(1)}
        </div>
      </div>

      {/* User Stats Bar */}
      {stats && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">PR Score</p>
                <p className="text-sm font-bold text-blue-600">{formatPRScore(stats.pr_score)}</p>
                <p className="text-xs text-gray-400">{getPRLabel(stats.pr_score)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Streak</p>
                <p className="text-sm font-bold text-gray-900">{stats.current_streak} days</p>
                <p className="text-xs text-gray-400">Best: {stats.best_streak}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Win Rate</p>
                <p className="text-sm font-bold text-gray-900">{winRate}%</p>
                <p className="text-xs text-gray-400">{stats.total_wins}/{stats.total_predictions}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                <Award className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Level {stats.level}</p>
                <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{stats.xp % 1000}/{1000} XP</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Claim */}
      {claimStatus?.canClaim && claimStep !== 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-green-800">
              {claimStatus.type === 'refund' ? '🔄 Refund Available' : '🏆 You Won Yesterday!'}
            </p>
            <p className="text-sm text-green-600 mt-0.5">
              {formatUSDC(parseFloat(claimStatus.amount || '0'))} ready to claim
            </p>
          </div>
          <div className="flex items-center gap-3">
            {claimStep === 'error' && (
              <p className="text-xs text-red-500 max-w-[140px] text-right">{claimError}</p>
            )}
            <button
              onClick={handleClaim}
              disabled={claimStep === 'claiming' || claimStep === 'recording'}
              className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {claimStep === 'claiming' && 'Claiming...'}
              {claimStep === 'recording' && 'Recording...'}
              {(claimStep === 'idle' || claimStep === 'error') && 'Claim Now'}
            </button>
          </div>
        </div>
      )}

      {claimStep === 'success' && (
<div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-3">
<div className="flex items-center gap-3">
<CheckCircle className="w-5 h-5 text-green-600" />
<p className="text-green-800 font-medium">Claimed! USDC sent to your wallet.</p>
</div>
{!showWinShareCard ? (
<button
onClick={() => setShowWinShareCard(true)}
className="flex items-center gap-2 text-sm text-green-700 underline underline-offset-2 hover:text-green-900 transition-colors"
>
<Share2 className="w-3.5 h-3.5" />
Share your win
</button>
) : stats && (
<ShareCard
mode="bet"
username={userProfile?.username || formatAddress(walletAddress || '')}
poolId={claimStatus?.poolId ?? 3}
poolLabel={['A','B','C','D','E'][(claimStatus?.poolId ?? 3) - 1]}
stakeAmount={parseFloat(claimStatus?.stakeAmount || '0')}
payoutAmount={parseFloat(claimStatus?.amount || '0')}
isWinner={true}
prScore={stats.pr_score}
level={stats.level}
date={new Date().toISOString()}
/>
)}
</div>
)}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <TrendingUp className="w-4 h-4" />Total Pool
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatUSDC(parseFloat(market.total_stake || '0'))}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Users className="w-4 h-4" />Participants
          </div>
          <p className="text-2xl font-bold text-gray-900">—</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Clock className="w-4 h-4" />Closes At
          </div>
          <p className="text-2xl font-bold text-gray-900">{closeTime} UTC</p>
        </div>
      </div>

            {/* Yesterday's Winners */}
      {yesterdayData?.winners?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-sm">
              🏆 Yesterday's Winners
            </h2>
            <span className="text-xs text-gray-400">
              Pool {['A','B','C','D','E'][(yesterdayData.market.winning_pool ?? 1) - 1]}
              {' · '}BTC @ {formatUSDC(parseFloat(yesterdayData.market.settlement_price || '0'))}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {yesterdayData.winners.slice(0, 8).map((w: any) => (
              <div key={w.id} className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-green-800">
                  {w.users?.username || formatAddress(w.users?.wallet_address || '')}
                </span>
                <span className="text-xs text-green-600">
                  +{formatUSDC(parseFloat(w.payout_amount || '0'))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pool Distribution */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-900">Pool Distribution</h2>
          <span className="text-xs text-gray-400">
            {isOpen ? 'Click a pool to place prediction' : 'Betting closed'}
          </span>
        </div>

                {/* Crowd Sentiment Bar */}
        {(() => {
          const total = displayPools.reduce((sum: number, p: any) => sum + parseFloat(p.stake || '0'), 0);
          return total > 0 ? (
            <div className="mb-5">
              <div className="flex h-3 rounded-full overflow-hidden gap-px">
                {displayPools.map((pool: any) => {
                  const colors = POOL_COLORS[pool.id as keyof typeof POOL_COLORS];
                  const pct = (parseFloat(pool.stake || '0') / total) * 100;
                  return pct > 0 ? (
                    <div
                      key={pool.id}
                      className={`${colors.badge} transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                      title={`Pool ${pool.label}: ${pct.toFixed(1)}%`}
                    />
                  ) : null;
                })}
              </div>
              <div className="flex justify-between mt-1.5">
                {displayPools.map((pool: any) => {
                  const pct = total > 0 ? ((parseFloat(pool.stake || '0') / total) * 100).toFixed(0) : '0';
                  return (
                    <span key={pool.id} className="text-xs text-gray-400 w-1/5 text-center">
                      {pool.label} {pct}%
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null;
        })()}

        <div className="grid grid-cols-5 gap-3">
          {displayPools.map((pool: any) => {
            const colors = POOL_COLORS[pool.id as keyof typeof POOL_COLORS];
            const pct = parseFloat(pool.participationPct || '0');
            const multiplier = pool.estimatedMultiplier;

            return (
              <button
                key={pool.id}
                disabled={!isOpen}
                onClick={() => handleSelectPool(pool.id)}
                className={`border-2 rounded-xl p-4 text-left flex flex-col gap-2 transition-all
                  ${colors.border} ${colors.bg}
                  ${isOpen ? 'hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 cursor-pointer' : 'cursor-default opacity-70'}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-sm ${colors.text}`}>{pool.label}</span>
                  <span className={`text-xs font-semibold ${colors.text}`}>
                    {multiplier !== '—' ? `${multiplier}x` : '—'}
                  </span>
                </div>
                <p className={`text-xs font-medium ${colors.text} leading-tight`}>
                  {POOL_NAMES[pool.id]}
                </p>
                <p className="text-xs text-gray-500 leading-tight">{pool.range}</p>
                <div className="h-1.5 bg-white bg-opacity-60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${colors.badge} transition-all duration-500`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{pct}%</span>
                  <span className="text-xs text-gray-500">{formatUSDC(parseFloat(pool.stake || '0'))}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LiveActivity marketId={market.id} isOpen={isOpen} />
        <LiveComments marketId={market.id} token={token} />
      </div>

      {/* Bet Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            {step === 'success' ? (
<div className="py-2">
<div className="text-center mb-5">
<CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
<h3 className="text-xl font-bold text-gray-900 mb-1">Prediction Placed!</h3>
{txHash && (
<a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
className="text-blue-600 text-xs hover:underline">
View on Basescan ↗
</a>
)}
</div>

{/* Share Card */}
{showShareCard && stats ? (
<div className="mb-4">
<ShareCard
mode="bet"
username={userProfile?.username || formatAddress(walletAddress || '')}
poolId={selectedPool ?? 1}
poolLabel={['A','B','C','D','E'][(selectedPool ?? 1) - 1]}
stakeAmount={amountNum}
prScore={stats.pr_score}
level={stats.level}
date={market?.date || new Date().toISOString()}
/>
</div>
) : (
<button
onClick={() => setShowShareCard(true)}
className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors mb-3 flex items-center justify-center gap-2"
>
<Share2 className="w-4 h-4" />
Share my prediction
</button>
)}

<button onClick={handleCloseModal}
className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
Done
</button>
</div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-900">Place Prediction</h3>
                  <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {selectedPoolData && (() => {
                  const colors = POOL_COLORS[selectedPoolData.id as keyof typeof POOL_COLORS];
                  return (
                    <div className={`rounded-xl p-4 mb-5 border-2 ${colors.border} ${colors.bg}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`font-bold ${colors.text}`}>Pool {selectedPoolData.label}</span>
                          <p className={`text-xs ${colors.text} mt-0.5`}>{POOL_NAMES[selectedPoolData.id]}</p>
                        </div>
                        <span className="text-sm text-gray-600">{selectedPoolData.range}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="mb-4">
                  <label className="text-sm text-gray-600 mb-2 block">Amount (USDC)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">USDC</span>
                    <input
                      type="number"
                      min="5"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Min. 5 USDC"
                      className="w-full border border-gray-200 rounded-xl py-3 pl-16 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                 {amount && !canBet && (
                    <p className="text-red-500 text-xs mt-1">Minimum 5 USDC</p>
                  )}
                  {amount && exceedsMax && (
                    <p className="text-red-500 text-xs mt-1">
                      Max bet: {formatUSDC(maxBet!)} (5% of pool)
                    </p>
                  )}

                  {amount && exceedsMax && (
                    <p className="text-red-500 text-xs mt-1">
                      Max bet: {formatUSDC(maxBet!)} (5% of pool)
                    </p>
                  )}

                  <div className="flex gap-2 mt-2">
                    {[10, 25, 50, 100].map((preset) => (
                      <button key={preset} onClick={() => setAmount(String(preset))}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {step === 'error' && (
                  <div className="flex items-start gap-2 bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-2 text-sm mb-5">
                  <div className="flex justify-between text-gray-500">
                    <span>Protocol Fee</span><span>5%</span>
                  </div>
                  {selectedPoolData?.estimatedMultiplier !== '—' && (
                    <div className="flex justify-between text-gray-500">
                      <span>Est. Multiplier</span>
                      <span className="font-medium text-gray-900">{selectedPoolData?.estimatedMultiplier}x</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handlePlaceBet}
                  disabled={!canBet || step === 'approving' || step === 'betting' || step === 'recording'}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {step === 'approving' && 'Approving USDC...'}
                  {step === 'betting' && 'Placing Bet...'}
                  {step === 'recording' && 'Recording...'}
                  {(step === 'idle' || step === 'error') && 'Confirm Prediction'}
                </button>

                <p className="text-xs text-gray-400 text-center mt-3">
                  Position is locked after confirmation. No early exit.
                </p>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

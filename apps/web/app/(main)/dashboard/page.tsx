'use client';

import MarketCountdown from '@/components/ui/MarketCountdown';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, http, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { useTodayMarket, useMarketPools } from '@/hooks/useMarket';
import { formatUSDC } from '@/lib/utils';
import { POOL_COLORS, USDC_ADDRESS, CONTRACT_ADDRESS } from '@/lib/constants';
import { Clock, TrendingUp, Users, X, AlertCircle, CheckCircle } from 'lucide-react';
import LiveActivity from '@/components/market/LiveActivity';
import LiveComments from '@/components/market/LiveComments';
import { predictionsApi } from '@/lib/api';

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
] as const;

type BetStep = 'idle' | 'approving' | 'betting' | 'recording' | 'success' | 'error';

export default function DashboardPage() {
  const { getAccessToken } = usePrivy();
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

  useEffect(() => {
    getAccessToken().then(setToken).catch(() => {});
  }, []);

  const isOpen = market?.status === 'open';
  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum >= 5;

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
  };

  const handlePlaceBet = async () => {
    if (!selectedPool || !isValidAmount || !market) return;
    const wallet = wallets[0];
    if (!wallet) {
      setErrorMsg('No wallet connected');
      setStep('error');
      return;
    }

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

  const closeTime = new Date(market.close_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  const defaultPools = [
    { id: 1, label: 'A', range: `< $${market.pool_a_upper}`, stake: market.pool_a_stake, participationPct: market.pool_a_pct, estimatedMultiplier: '—' },
    { id: 2, label: 'B', range: `$${market.pool_a_upper} – $${market.pool_b_upper}`, stake: market.pool_b_stake, participationPct: market.pool_b_pct, estimatedMultiplier: '—' },
    { id: 3, label: 'C', range: `$${market.pool_b_upper} – $${market.pool_c_upper}`, stake: market.pool_c_stake, participationPct: market.pool_c_pct, estimatedMultiplier: '—' },
    { id: 4, label: 'D', range: `$${market.pool_c_upper} – $${market.pool_d_upper}`, stake: market.pool_d_stake, participationPct: market.pool_d_pct, estimatedMultiplier: '—' },
    { id: 5, label: 'E', range: `>= $${market.pool_d_upper}`, stake: market.pool_e_stake, participationPct: market.pool_e_pct, estimatedMultiplier: '—' },
  ];

  const displayPools = pools || defaultPools;
  const selectedPoolData = displayPools.find((p: any) => p.id === selectedPool);
  return(
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

      {/* Pool Distribution — horizontal, clickable */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-900">Pool Distribution</h2>
          <span className="text-xs text-gray-400">
            {isOpen ? 'Click a pool to place prediction' : 'Updates every 15s'}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {displayPools.map((pool: any) => {
            const colors = POOL_COLORS[pool.id as keyof typeof POOL_COLORS];
            const pct = parseFloat(pool.participationPct || '0');

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
                    {pool.estimatedMultiplier !== '—' ? `${pool.estimatedMultiplier}x` : '—'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-tight">{pool.range}</p>
                <div className="h-1.5 bg-white bg-opacity-60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${colors.badge} transition-all duration-500`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{pct}%</span>
                  <span className="text-xstext-gray-500">{formatUSDC(parseFloat(pool.stake || '0'))}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveActivity marketId={market.id} />
        <LiveComments marketId={market.id} token={token} />
      </div>

      {/* Bet Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">

            {step === 'success' ? (
              <div className="text-center py-4">
                <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-gray-900 mb-1">Prediction Placed!</h3>
                <p className="text-gray-500 text-sm mb-2">
                  Pool {['A','B','C','D','E'][(selectedPool ?? 1) - 1]} · {formatUSDC(amountNum)}
                </p>
                {txHash && (
                  <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 text-sm hover:underline">
                    View on Basescan
                  </a>
                )}
                <button onClick={handleCloseModal}
                  className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
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
                        <span className={`font-bold ${colors.text}`}>Pool {selectedPoolData.label}</span>
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
                  {amount && !isValidAmount && (
                    <p className="text-red-500 text-xs mt-1">Minimum 5 USDC</p>
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
                    <span>Protocol Fee</span>
                    <span>5%</span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceBet}
                  disabled={!isValidAmount || step === 'approving' || step === 'betting' || step === 'recording'}
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

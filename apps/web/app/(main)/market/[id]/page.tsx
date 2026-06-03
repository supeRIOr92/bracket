'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, createWalletClient, custom, http, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { useMarket, useMarketPools } from '@/hooks/useMarket';
import { predictionsApi } from '@/lib/api';
import { formatUSDC } from '@/lib/utils';
import { POOL_COLORS, USDC_ADDRESS, CONTRACT_ADDRESS } from '@/lib/constants';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import LiveActivity from '@/components/market/LiveActivity';
import LiveComments from '@/components/market/LiveComments';

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

export default function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = usePrivy();
  const { wallets } = useWallets();

  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem('bracket_token'));
  }, []);

  const { data: market, isLoading } = useMarket(id);
  const { data: pools } = useMarketPools(id);

  const [selectedPool, setSelectedPool] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<BetStep>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [txHash, setTxHash] = useState('');

  const isOpen = market?.status === 'open';
  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum >= 5;

  const displayPools = pools || (market ? [
    { id: 1, label: 'A', range: `< $${market.pool_a_upper}`, stake: market.pool_a_stake, participationPct: market.pool_a_pct, estimatedMultiplier: '—' },
    { id: 2, label: 'B', range: `$${market.pool_a_upper} – $${market.pool_b_upper}`, stake: market.pool_b_stake, participationPct: market.pool_b_pct, estimatedMultiplier: '—' },
    { id: 3, label: 'C', range: `$${market.pool_b_upper} – $${market.pool_c_upper}`, stake: market.pool_c_stake, participationPct: market.pool_c_pct, estimatedMultiplier: '—' },
    { id: 4, label: 'D', range: `$${market.pool_c_upper} – $${market.pool_d_upper}`, stake: market.pool_d_stake, participationPct: market.pool_d_pct, estimatedMultiplier: '—' },
    { id: 5, label: 'E', range: `>= $${market.pool_d_upper}`, stake: market.pool_e_stake, participationPct: market.pool_e_pct, estimatedMultiplier: '—' },
  ] : []);

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
      const walletClient = createWalletClient({
        chain: base,
        transport: custom(provider),
      });

      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });
      const address = wallet.address as `0x${string}`;
      const amountInUnits = parseUnits(amount, 6);

      // Step 1: Check allowance
      const allowance = await publicClient.readContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: USDC_ABI,
        functionName: 'allowance',
        args: [address, CONTRACT_ADDRESS],
      });

      // Step 2: Approve if needed
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

      // Step 3: Place bet
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

      // Step 4: Record to backend
      setStep('recording');
      await predictionsApi.record({
        marketId: market.id,
        poolId: selectedPool,
        stakeAmount: amountNum,
        txHash: betTx,
      });

      setStep('success');
    } catch (err: any) {
      console.error(err);
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

  if (!market) {
    return <div className="text-center py-24 text-gray-400">Market not found.</div>;
  }

  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Prediction Placed!</h1>
        <p className="text-gray-500 mb-2">
          You picked Pool {['A', 'B', 'C', 'D', 'E'][selectedPool! - 1]} · {formatUSDC(amountNum)}
        </p>
        {txHash && (
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 text-sm hover:underline"
          >
            View on Basescan
          </a>
        )}
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }
return(
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* LEFT — main content */}
      <div className="lg:col-span-2 space-y-6">

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Place Prediction</h1>
            <p className="text-gray-500 text-sm">
              {new Date(market.date).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Pool Selection */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">1. Select Your Pool</h2>
          <div className="space-y-3">
            {displayPools.map((pool: any) => {
              const colors = POOL_COLORS[pool.id as keyof typeof POOL_COLORS];
              const pct = parseFloat(pool.participationPct || '0');
              const isSelected = selectedPool === pool.id;

              return (
                <button
                  key={pool.id}
                  disabled={!isOpen}
                  onClick={() => setSelectedPool(pool.id)}
                  className={`w-full border-2 rounded-xl p-4 text-left transition-all ${
                    isSelected
                      ? `${colors.border} ${colors.bg} ring-2 ring-blue-500 ring-offset-1`
                      : `${colors.border} ${colors.bg} hover:opacity-90`
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-sm w-6 ${colors.text}`}>
                        {pool.label}
                      </span>
                      <span className="text-gray-600 text-sm">{pool.range}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">{pct}% of pool</span>
                      <span className={`font-bold ${colors.text}`}>
                        {pool.estimatedMultiplier !== '—' ? `${pool.estimatedMultiplier}x` : '—'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount Input */}
        {selectedPool && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">2. Enter Amount</h2>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                USDC
              </span>
              <input
                type="number"
                min="5"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Min. 5 USDC"
                className="w-full border border-gray-200 rounded-xl py-3 pl-16 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {amount && !isValidAmount && (
              <p className="text-red-500 text-sm mt-2">Minimum bet is 5 USDC</p>
            )}
            <div className="flex gap-2 mt-3">
              {[10, 25, 50, 100].map((preset) => (
                <button                key={preset}
                  onClick={() => setAmount(String(preset))}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Confirm */}
        {selectedPool && isValidAmount && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">3. Confirm</h2>
            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-gray-500">Pool</span>
                <span className="font-medium">Pool {['A', 'B', 'C', 'D', 'E'][selectedPool - 1]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-medium">{formatUSDC(amountNum)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Protocol Fee</span>
                <span className="font-medium">5%</span>
              </div>
            </div>

            {step === 'error' && (
              <div className="flex items-start gap-2 bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              onClick={handlePlaceBet}
              disabled={step === 'approving' || step === 'betting' || step === 'recording'}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {step === 'approving' && 'Approving USDC...'}
              {step === 'betting' && 'Placing Bet...'}
              {step === 'recording' && 'Recording...'}
              {(step === 'idle' || step === 'error') && 'Place Prediction'}
            </button>

            <p className="text-xs text-gray-400 text-center mt-3">
              Position is locked after confirmation. No early exit.
            </p>
          </div>
        )}

        {!isOpen && (
          <div className="bg-gray-100 rounded-xl p-4 text-center text-gray-500 text-sm">
            Betting is closed for this market.
          </div>
        )}

      </div>

      {/* RIGHT — live panels */}
      <div className="space-y-6">
        <LiveActivity marketId={id} />
        <LiveComments marketId={id} token={token} />
      </div>

    </div>
  );
}
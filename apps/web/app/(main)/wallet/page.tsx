'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { Copy, Check, ArrowDownToLine, ArrowUpFromLine, ExternalLink } from 'lucide-react';
import { USDC_ADDRESS } from '@/lib/constants';

const USDC_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

type WithdrawStep = 'idle' | 'sending' | 'success' | 'error';

export default function WalletPage() {
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const address = wallet?.address ?? '';

  const [balance, setBalance] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<WithdrawStep>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    if (!address) return;
    const publicClient = createPublicClient({ chain: base, transport: http() });
    publicClient.readContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: USDC_BALANCE_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    }).then((raw) => {
      setBalance(formatUnits(raw as bigint, 6));
    }).catch(() => setBalance('0'));
  }, [address]);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = async () => {
    if (!wallet || !toAddress || !amount) return;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    try {
      setStep('sending');
      setErrorMsg('');

      const provider = await wallet.getEthereumProvider();
      const chainId = await provider.request({ method: 'eth_chainId' }) as string;
      if (parseInt(chainId, 16) !== 8453) {
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2105' }],
          });
        } catch {
          setErrorMsg('Please switch to Base network.');
          setStep('error');
          return;
        }
      }

      const { createWalletClient, custom } = await import('viem');
      const walletClient = createWalletClient({ chain: base, transport: custom(provider) });
      const publicClient = createPublicClient({ chain: base, transport: http() });

      const tx = await walletClient.writeContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: USDC_BALANCE_ABI,
        functionName: 'transfer',
        args: [toAddress as `0x${string}`, parseUnits(amount, 6)],
        account: address as `0x${string}`,
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      setTxHash(tx);
      setStep('success');

      // Refresh balance
      const raw = await publicClient.readContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: USDC_BALANCE_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      });
      setBalance(formatUnits(raw as bigint, 6));
    } catch (err: any) {
      setErrorMsg(err?.message || 'Transaction failed');
      setStep('error');
    }
  };
  
  if (!address) {
    return (
      <div className="text-center py-16 text-gray-400">
        Connect your wallet to view balance.
      </div>
    );
  }
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>

      {/* Balance Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-2">
        <p className="text-sm text-gray-400">USDC Balance</p>
        <p className="text-4xl font-bold text-gray-900">
          {balance === null ? '...' : `$${parseFloat(balance).toFixed(2)}`}
        </p>
        <p className="text-xs text-gray-400">on Base network</p>
      </div>

      {/* Deposit */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="w-4 h-4 text-green-600" />
          <h2 className="font-semibold text-gray-900">Deposit</h2>
        </div>
        <p className="text-sm text-gray-500">
          Send USDC on <span className="font-medium text-gray-700">Base network</span> to your address below.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between gap-3">
          <span className="text-sm font-mono text-gray-700 break-all">{address}</span>
          <button
            onClick={handleCopy}
            className="shrink-0 p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-500"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-red-400">⚠️ Only send USDC on Base. Other tokens or networks may result in permanent loss.</p>
      </div>

      {/* Withdraw */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ArrowUpFromLine className="w-4 h-4 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Withdraw</h2>
        </div>

        {step === 'success' ? (
          <div className="space-y-3">
            <p className="text-green-700 font-medium">✅ Sent successfully!</p>
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              View on Basescan <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => { setStep('idle'); setAmount(''); setToAddress(''); setTxHash(''); }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Send again
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Destination Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Amount (USDC)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">USDC</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl py-3 pl-16 pr-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {balance && (
                  <button onClick={() => setAmount(parseFloat(balance).toFixed(6))}
                    className="text-xs text-blue-500 mt-1 hover:underline"
                  >
                    Max: ${parseFloat(balance).toFixed(2)}
                  </button>
                )}
              </div>
            </div>

            {step === 'error' && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
            )}

            <button
              onClick={handleWithdraw}
              disabled={!toAddress || !amount || step === 'sending'}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {step === 'sending' ? 'Sending...' : 'Withdraw USDC'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

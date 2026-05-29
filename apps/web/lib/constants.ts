export const CHAIN_ID = 8453; // Base Mainnet

export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export const CONTRACT_ADDRESS =
process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export const API_URL =
process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const POOL_COLORS = {
1: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100' },
2: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', badge: 'bg-sky-100' },
3: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100' },
4: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', badge: 'bg-violet-100' },
5: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100' },
} as const;

export const PR_TIERS = [
{ label: 'Legend', min: 2500, color: 'text-yellow-500' },
{ label: 'Expert', min: 2000, color: 'text-purple-500' },
{ label: 'Advanced', min: 1500, color: 'text-blue-500' },{ label: 'Predictor', min: 1000, color: 'text-green-500' },
{ label: 'Novice', min: 0, color: 'text-gray-500' },
];

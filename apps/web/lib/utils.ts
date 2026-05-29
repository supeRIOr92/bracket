import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
return twMerge(clsx(inputs));
}

export function formatUSDC(amount: number | string): string {
const num = typeof amount === 'string' ? parseFloat(amount) : amount;
return new Intl.NumberFormat('en-US', {
style: 'currency',
currency: 'USD',
minimumFractionDigits: 2,
maximumFractionDigits: 2,
}).format(num);
}

export function formatAddress(address: string): string {
if (!address) return '';
return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatPRScore(score: number): string {
return score.toLocaleString('en-US');
}

export function getPRLabel(score: number): string {
if (score >= 2500) return 'Legend';
if (score >= 2000) return 'Expert';
if (score >= 1500) return 'Advanced';
if (score >= 1000) return 'Predictor';
return 'Novice';
}

export function getPoolLabel(poolId: number): string {
return ['A', 'B', 'C', 'D', 'E'][poolId - 1] ?? '?';
}

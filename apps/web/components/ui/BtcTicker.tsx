'use client';
import { useEffect, useState } from 'react';

interface BtcData {
  price: number;
  change24h: number;
}

export default function BtcTicker() {
  const [data, setData] = useState<BtcData | null>(null);

  const fetchPrice = async () => {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'
      );
      const json = await res.json();
      setData({
        price: json.bitcoin.usd,
        change24h: json.bitcoin.usd_24h_change,
      });
    } catch {}
  };

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return null;

  const isPositive = data.change24h >= 0;

  return (
    <div className="flex items-center gap-2 text-sm font-mono">
      <span className="text-zinc-400">₿ BTC</span>
      <span className="font-semibold text-white">
        ${data.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </span>
      <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
        {isPositive ? '▲' : '▼'} {Math.abs(data.change24h).toFixed(2)}%
      </span>
    </div>
  );
}
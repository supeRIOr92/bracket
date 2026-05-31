'use client';
import { useEffect, useState } from 'react';

function getCountdown() {
  const now = new Date();
  const utcNow = new Date(now.toUTCString());

  const closeAt = new Date(utcNow);
  closeAt.setUTCHours(23, 0, 0, 0);

  const openAt = new Date(utcNow);
  openAt.setUTCHours(0, 0, 0, 0);
  if (openAt <= utcNow) openAt.setUTCDate(openAt.getUTCDate() + 1);

  const utcHour = utcNow.getUTCHours();
  const isMarketOpen = utcHour >= 0 && utcHour < 23;
  const target = isMarketOpen ? closeAt : openAt;

  const diff = target.getTime() - utcNow.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return {
    isMarketOpen,
    timeStr: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
  };
}

export default function MarketCountdown() {
  const [state, setState] = useState(getCountdown());

  useEffect(() => {
    const interval = setInterval(() => setState(getCountdown()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-1 py-6">
      <p className="text-sm text-gray-500">
        {state.isMarketOpen ? 'Betting closes in' : 'Next market opens in'}
      </p>
      <p className="text-3xl font-mono font-bold text-blue-600">
        {state.timeStr}
      </p>
      <p className="text-xs text-gray-400">
        {state.isMarketOpen
          ? 'Market closes at 23:00 UTC'
          : 'Market opens at 00:00 UTC'}
      </p>
    </div>
  );
}
'use client';

import Link from 'next/link';
import { useMarketActivity, type Activity } from '@/hooks/useMarketActivity';
import { formatDistanceToNow } from 'date-fns';
import { POOL_COLORS } from '@/lib/constants';
import { formatUSDC } from '@/lib/utils';

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const POOL_LABELS = ['A', 'B', 'C', 'D', 'E'];

function ActivityRow({ item, isOpen }: { item: Activity; isOpen: boolean }) {
  const poolLabel = POOL_LABELS[(item.pool_id ?? 1) - 1];
  const colors = POOL_COLORS[(item.pool_id ?? 1) as keyof typeof POOL_COLORS];
  const name = item.users.username || shortAddr(item.users.wallet_address);
  const amount = parseFloat(item.amount);

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      {/* Pool badge — hidden selama betting open */}
      <span
        className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          isOpen ? 'bg-gray-100 text-gray-400' : `${colors.bg} ${colors.text}`
        }`}
      >
        {isOpen ? '?' : poolLabel}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 leading-snug">
          <Link href={`/profile/${item.users.wallet_address}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
          {name}
          </Link>

          {isOpen ? (
            <> placed a prediction</>
          ) : (
            <>
              {' '}placed{' '}
              <span className="font-semibold text-gray-900">{formatUSDC(amount)}</span>
              {' '}on Pool {poolLabel}
            </>
          )}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

interface Props {
  marketId: string;
  isOpen?: boolean;
}

export default function LiveActivity({ marketId, isOpen = false }: Props) {
  const { activity, loading } = useMarketActivity(marketId);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 flex flex-col h-[480px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="font-semibold text-gray-900 text-sm">Live Activity</span>
        <span className="flex items-center gap-1.5 text-xs text-green-600">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-1">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && activity.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">
            Belum ada activity. Be the first to bet! 🎯
          </p>
        )}
        {activity.map((item) => (
          <ActivityRow key={item.id} item={item} isOpen={isOpen} />
        ))}
      </div>
    </div>
  );
}

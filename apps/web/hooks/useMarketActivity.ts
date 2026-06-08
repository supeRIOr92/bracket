import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Activity {
  id: string;
  pool_id: number;
  amount: string;
  created_at: string;
  users: {
    username: string | null;
    wallet_address: string;
  };
}

export function useMarketActivity(marketId: string) {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!marketId) return;

    // Initial fetch
    supabase
      .from('market_activity')
      .select(`id, pool_id, amount, created_at, users(username, wallet_address)`)
      .eq('market_id', marketId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setActivity(data as unknown as Activity[]);
        setLoading(false);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`activity:${marketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_activity',
          filter: `market_id=eq.${marketId}`,
        },
        (payload) => {
          setActivity((prev) => [payload.new as Activity, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [marketId]);

  return { activity, loading };
}

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  users: {
    username: string | null;
    wallet_address: string;
    avatar_url: string | null;  // tambah ini
  };
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  users: {
    username: string | null;
    wallet_address: string;
    avatar_url: string | null;
  };
}

export function useMarketComments(marketId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!marketId) return;

    // Initial fetch
    supabase
      .from('market_comments')
      .select(`id, content, created_at, users(username, wallet_address, avatar_url)`)
      .eq('market_id', marketId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setComments(data as unknown as Comment[]);
        setLoading(false);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`comments:${marketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_comments',
          filter: `market_id=eq.${marketId}`,
        },
        (payload) => {
          setComments((prev) => [payload.new as Comment, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [marketId]);

  return { comments, loading };
}

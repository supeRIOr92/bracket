import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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

  const fetchComments = async () => {
    const { data } = await supabase
      .from('market_comments')
      .select(`id, content, created_at, users(username, wallet_address, avatar_url)`)
      .eq('market_id', marketId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setComments(data as unknown as Comment[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!marketId) return;

    fetchComments();

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
        () => {
          // Re-fetch biar dapat data lengkap termasuk users
          fetchComments();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [marketId]);

  return { comments, loading };
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class ChatService {
  constructor(private readonly supabase: SupabaseService) {}

  async getComments(marketId: string, limit = 50) {
    const { data, error } = await this.supabase.getClient()
      .from('market_comments')
      .select(`
        id,
        content,
        created_at,
        users (
          id,
          wallet_address,
          username,
          avatar_url
        )
      `)
      .eq ('market_id', marketId)
      .order('created_at', { ascending: false })
      .limit(limit);
      if (error) throw new BadRequestException(error.message);
    return (data || []).reverse();
  }

  async getActivity(marketId: string, limit = 30) {
    const { data, error } = await this.supabase.getClient()
      .from('market_activity')
      .select(`
        id,
        activity_type,
        pool_id,
        amount,
        created_at,
        users (
          id,
          wallet_address,
          username,
          avatar_url
        )
      `)
      .eq('market_id', marketId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new BadRequestException(error.message);
    return (data || []).reverse();
  }

  async postComment(marketId: string, userId: string, content: string) {
    // Verify market exists and is open
    const { data: market } = await this.supabase.getClient()
      .from('markets')
      .select('id, status')
      .eq('id', marketId)
      .single();

    if (!market) throw new BadRequestException('Market not found');

    const { data, error } = await this.supabase.getClient()
      .from('market_comments')
      .insert({ market_id: marketId, user_id: userId, content })
      .select(`
        id,
        content,
        created_at,
        users (
          id,
          wallet_address,
          username,
          avatar_url
        )
      `)
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}

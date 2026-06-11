import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class PredictionsService {
constructor(private supabase: SupabaseService) {}

async recordPrediction(
userId: string,
marketId: string,
poolId: number,
stakeAmount: number,
txHash: string,
) {
const db = this.supabase.getClient();

const { data: market } = await db
.from('markets')
.select('status')
.eq('id', marketId)
.single();

if (!market || market.status !== 'open') {
throw new BadRequestException('Market is not open for betting');
}

const { data: existing } = await db
.from('predictions')
.select('id')
.eq('user_id', userId)
.eq('market_id', marketId)
.single();

if (existing) {
throw new BadRequestException('Already placed a prediction for this market');
}

const { data, error } = await db
.from('predictions')
.insert({
user_id: userId,
market_id: marketId,
pool_id: poolId,
stake_amount: stakeAmount,
tx_hash_bet: txHash,
})
.select()
.single();

if (error) throw new Error(error.message);

await db.rpc('increment_user_stat', {
p_user_id: userId,
p_field: 'total_wagered',
p_value: stakeAmount,
});

return data;
}

async recordClaim(userId: string, marketId: string, txHash: string) {
const db = this.supabase.getClient();

const { data, error } = await db
.from('predictions')
.update({
is_claimed: true,
claimed_at: new Date().toISOString(),
tx_hash_claim: txHash,
})
.eq('user_id', userId)
.eq('market_id', marketId)
.select()
.single();

if (error || !data) throw new NotFoundException('Prediction not found');

// Update total_payout kalau menang (payout_amount > 0)
const payout = parseFloat(data.payout_amount || '0');
if (payout > 0) {
await db.rpc('increment_user_stat', {
p_user_id: userId,
p_field: 'total_payout',
p_value: payout,
});
}

return data;
}

async getUserPredictions(userId: string, limit = 20, offset = 0) {
const db = this.supabase.getClient();

const { data, error } = await db
.from('predictions')
.select(`
*,
markets(date, status, pool_a_upper, pool_b_upper, pool_c_upper, pool_d_upper, winning_pool, settlement_price)
`)
.eq('user_id', userId)
.order('created_at', { ascending: false })
.range(offset, offset + limit - 1);

if (error) throw new Error(error.message);
return data;
}

async getPublicPredictions(walletAddress: string, limit = 20, offset = 0) {
const db = this.supabase.getClient();

const { data: user } = await db
.from('users')
.select('id')
.eq('wallet_address', walletAddress.toLowerCase())
.single();

if (!user) return [];

const { data, error } = await db
.from('predictions')
.select(`
id,
pool_id,
stake_amount,
payout_amount,
is_winner,
is_refund,
created_at,
markets(date, status, winning_pool, settlement_price, pool_a_upper, pool_b_upper, pool_c_upper, pool_d_upper)
`)
.eq('user_id', user.id)
.order('created_at', { ascending: false })
.range(offset, offset + limit - 1);

if (error) throw new Error(error.message);

// Filter di app level karena Supabase tidak support filter pada nested relation
const filtered = (data || []).filter((p: any) =>
p.markets && ['settled', 'refunded'].includes(p.markets.status)
);
return filtered;
}

async getClaimStatus(userId: string, marketId: string) {
const db = this.supabase.getClient();

const { data: prediction } = await db
.from('predictions')
.select('*, markets(status, winning_pool, is_refund)')
.eq('user_id', userId)
.eq('market_id', marketId)
.single();

if (!prediction) return { canClaim: false, reason: 'No prediction found' };

const market = (prediction as any).markets;

if (!['settled', 'refunded'].includes(market?.status)) {
return { canClaim: false, reason: 'Market not settled yet' };
}

if (prediction.is_claimed) {
return { canClaim: false, reason: 'Already claimed' };
}

if (market.is_refund) {
return {
canClaim: true,
type: 'refund',
amount: prediction.stake_amount,
stakeAmount: prediction.stake_amount,
poolId: prediction.pool_id,
};
}

if (prediction.pool_id !== market.winning_pool) {
return { canClaim: false, reason: 'Not a winner' };
}

return {
canClaim: true,
type: 'win',
amount: prediction.payout_amount,
stakeAmount: prediction.stake_amount,
poolId: prediction.pool_id,
};
}
}

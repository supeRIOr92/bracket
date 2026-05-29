export interface Market {
id: string;
date: string;
status: 'open' | 'closed' | 'settled' | 'refunded' | 'archived';
pool_a_upper: string;
pool_b_upper: string;
pool_c_upper: string;
pool_d_upper: string;
pool_a_stake: string;
pool_b_stake: string;
pool_c_stake: string;
pool_d_stake: string;
pool_e_stake: string;
total_stake: string;
pool_a_pct: string;
pool_b_pct: string;
pool_c_pct: string;
pool_d_pct: string;
pool_e_pct: string;
winning_pool: number | null;
settlement_price: string | null;
is_refund: boolean;
}

export interface Pool {
id: number;
label: string;
range: string;
stake: number;
participationPct: string;
estimatedMultiplier: string;
isWinner: boolean;
}

export interface User {
id: string;
wallet_address: string;
username: string | null;
avatar_url: string | null;
bio: string | null;
created_at: string;
user_stats: UserStats;
}

export interface UserStats {
pr_score: number;
xp: number;
level: number;
total_predictions: number;
total_wins: number;
current_streak: number;
best_streak: number;
total_wagered: string;
total_payout: string;
archetype: string | null;
}

export interface Prediction {
id: string;
pool_id: number;
stake_amount: string;
payout_amount: string | null;
is_winner: boolean | null;
is_refund: boolean;
is_claimed: boolean;
created_at: string;
markets: {
date: string;
status: string;
winning_pool: number | null;
settlement_price: string | null;
};
}
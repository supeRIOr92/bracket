-- ─────────────────────────────────────────────────────────────────
-- BRACKET — Initial Schema Migration
-- ─────────────────────────────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ───────────────────────────────────────────────────────

CREATE TYPE market_status AS ENUM ('open', 'closed', 'settled', 'refunded', 'archived');
CREATE TYPE jackpot_category AS ENUM ('community', 'skill', 'activity', 'contrarian');
CREATE TYPE season_status AS ENUM ('upcoming', 'active', 'ended');
CREATE TYPE archetype_type AS ENUM (
'consensus_predictor',
'contrarian_predictor',
'sharpshooter',
'value_hunter'
);

-- ─── USERS ───────────────────────────────────────────────────────

CREATE TABLE users (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
wallet_address VARCHAR(42) UNIQUE NOT NULL,
email VARCHAR(255),
username VARCHAR(50) UNIQUE,
avatar_url TEXT,
bio TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_username ON users(username);

-- ─── USER STATS ──────────────────────────────────────────────────

CREATE TABLE user_stats (
user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
pr_score NUMERIC(10,2) DEFAULT 1000,
xp BIGINT DEFAULT 0,
level INTEGER DEFAULT 1,
total_predictions INTEGER DEFAULT 0,
total_wins INTEGER DEFAULT 0,
current_streak INTEGER DEFAULT 0,
best_streak INTEGER DEFAULT 0,
total_wagered NUMERIC(18,6) DEFAULT 0,
total_payout NUMERIC(18,6) DEFAULT 0,
archetype archetype_type,
contrarian_attempts INTEGER DEFAULT 0, -- bets di pool A/E
contrarian_wins INTEGER DEFAULT 0, -- menang di pool A/E
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── MARKETS ─────────────────────────────────────────────────────

CREATE TABLE markets (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
chain_market_id BIGINT UNIQUE, -- ID dari smart contract
asset VARCHAR(10) NOT NULL DEFAULT 'BTC',
date DATE NOT NULL UNIQUE,
status market_status NOT NULL DEFAULT 'open',
open_at TIMESTAMP WITH TIME ZONE NOT NULL,
close_at TIMESTAMP WITH TIME ZONE NOT NULL,
settle_at TIMESTAMP WITH TIME ZONE NOT NULL,
btc_price_at_open NUMERIC(18,2),
expected_move_pct NUMERIC(8,4),

-- Pool boundaries (half-open intervals)
-- Pool A: price < pool_a_upper
-- Pool B: pool_a_upper <= price < pool_b_upper
-- Pool C: pool_b_upper <= price < pool_c_upper
-- Pool D: pool_c_upper <= price < pool_d_upper
-- Pool E: price >= pool_d_upper
pool_a_upper NUMERIC(18,2) NOT NULL,
pool_b_upper NUMERIC(18,2) NOT NULL,
pool_c_upper NUMERIC(18,2) NOT NULL,
pool_d_upper NUMERIC(18,2) NOT NULL,

-- Pool stakes (diupdate realtime dari events)
pool_a_stake NUMERIC(18,6) DEFAULT 0,
pool_b_stake NUMERIC(18,6) DEFAULT 0,
pool_c_stake NUMERIC(18,6) DEFAULT 0,
pool_d_stake NUMERIC(18,6) DEFAULT 0,
pool_e_stake NUMERIC(18,6) DEFAULT 0,
total_stake NUMERIC(18,6) DEFAULT 0,

-- Settlement data
settlement_price NUMERIC(18,2),
winning_pool SMALLINT, -- 1..5
is_refund BOOLEAN DEFAULT FALSE, -- true jika market invalid (rule baru)
oracle_tx_hash VARCHAR(66),
oracle_round_id VARCHAR(78),

-- Fee tracking
dev_fee_collected NUMERIC(18,6) DEFAULT 0,
jackpot_fee_collected NUMERIC(18,6) DEFAULT 0,
flywheel_fee_collected NUMERIC(18,6) DEFAULT 0,

created_at TIMESTAMP WITH TIMEZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_markets_date ON markets(date);
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_chain_id ON markets(chain_market_id);

-- ─── PREDICTIONS ─────────────────────────────────────────────────

CREATE TABLE predictions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
pool_id SMALLINT NOT NULL CHECK (pool_id BETWEEN 1 AND 5),
stake_amount NUMERIC(18,6) NOT NULL CHECK (stake_amount >= 5),
payout_amount NUMERIC(18,6), -- null sampai settled
is_winner BOOLEAN, -- null sampai settled
is_refund BOOLEAN DEFAULT FALSE, -- true jika market direfund
is_claimed BOOLEAN DEFAULT FALSE,
claimed_at TIMESTAMP WITH TIME ZONE,
tx_hash_bet VARCHAR(66),
tx_hash_claim VARCHAR(66),
block_number_bet BIGINT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

UNIQUE(user_id, market_id) -- 1 user = 1 prediksi per market
);

CREATE INDEX idx_predictions_user ON predictions(user_id);
CREATE INDEX idx_predictions_market ON predictions(market_id);
CREATE INDEX idx_predictions_user_market ON predictions(user_id, market_id);

-- ─── SEASONS ─────────────────────────────────────────────────────

CREATE TABLE seasons (
id VARCHAR(10) PRIMARY KEY, -- e.g. "2026-Q2"
start_date DATE NOT NULL,
end_date DATE NOT NULL,
status season_status NOT NULL DEFAULT 'upcoming'
);

-- Insert current season
INSERT INTO seasons (id, start_date, end_date, status)
VALUES ('2026-Q2', '2026-04-01', '2026-06-30', 'active');

-- ─── SEASON RANKINGS ─────────────────────────────────────────────

CREATE TABLE season_rankings (
season VARCHAR(10) REFERENCES seasons(id),
user_id UUID REFERENCES users(id) ON DELETE CASCADE,
pr_score NUMERIC(10,2),
rank INTEGER,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

PRIMARY KEY (season, user_id)
);

-- ─── FOLLOWS ─────────────────────────────────────────────────────

CREATE TABLE follows (
follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
following_id UUID REFERENCES users(id) ON DELETE CASCADE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

PRIMARY KEY (follower_id, following_id),
CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- ─── ACHIEVEMENTS ────────────────────────────────────────────────

CREATE TABLE achievements (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
achievement_key VARCHAR(100) NOT NULL,
unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

UNIQUE(user_id, achievement_key)
);

CREATE INDEX idx_achievements_user ON achievements(user_id);

-- ─── JACKPOT ELIGIBILITY ─────────────────────────────────────────

CREATE TABLE jackpot_eligibility (
user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
account_age_days INTEGER DEFAULT 0,
settled_predictions INTEGER DEFAULT 0,
is_eligible BOOLEAN DEFAULT FALSE,
tickets_this_week INTEGER DEFAULT 1,
season VARCHAR(10) REFERENCES seasons(id),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── JACKPOT DRAWS ───────────────────────────────────────────────

CREATE TABLE jackpot_draws (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
season VARCHAR(10) REFERENCES seasons(id),
draw_date DATE NOT NULL,
category jackpot_category NOT NULL,
winner_user_id UUID REFERENCES users(id),
prize_amount NUMERIC(18,6) NOT NULL,
tx_hash VARCHAR(66),
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── UPDATED_AT TRIGGERS ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_user_stats_updated_at
BEFORE UPDATE ON user_statsFOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_markets_updated_at
BEFORE UPDATE ON markets
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_predictions_updated_at
BEFORE UPDATE ON predictions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- Row Level Security Policies
-- ─────────────────────────────────────────────────────────────────

-- Users: publik bisa baca, hanya user sendiri yang bisa update
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_all" ON users
FOR SELECT USING (true);

CREATE POLICY "users_update_own" ON users
FOR UPDATE USING (wallet_address = current_setting('app.wallet_address', true));

-- User stats: publik bisa baca
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_stats_select_all" ON user_stats
FOR SELECT USING (true);

-- Markets: publik bisa baca
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "markets_select_all" ON markets
FOR SELECT USING (true);

-- Predictions: user hanya bisa lihat miliknya sendiri (sebelum market closed)
-- Setelah market closed, semua bisa lihat
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "predictions_select_own" ON predictions
FOR SELECT USING (
user_id = (
SELECT id FROM users
WHERE wallet_address = current_setting('app.wallet_address', true)
)
OR
EXISTS (
SELECT 1 FROM markets m
WHERE m.id = market_id
AND m.status IN ('settled', 'refunded', 'archived')
)
);

-- Follows: publik bisa baca
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_all" ON follows
FOR SELECT USING (true);

-- Season rankings: publik bisa baca
ALTER TABLE season_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "season_rankings_select_all" ON season_rankings
FOR SELECT USING (true);

-- Achievements: publik bisa baca
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievements_select_all" ON achievements
FOR SELECT USING (true);

-- Jackpot: publik bisa baca
ALTER TABLE jackpot_draws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jackpot_draws_select_all" ON jackpot_draws
FOR SELECT USING (true);

ALTER TABLE jackpot_eligibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jackpot_eligibility_select_all" ON jackpot_eligibility
FOR SELECT USING (true);

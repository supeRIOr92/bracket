-- ─────────────────────────────────────────────────────────────────
-- Convenience Views
-- ─────────────────────────────────────────────────────────────────

-- Market dengan pool distribution dalam persentase
CREATE OR REPLACE VIEW market_pool_distribution AS
SELECT
m.id,
m.date,
m.status,
m.pool_a_upper,
m.pool_b_upper,
m.pool_c_upper,
m.pool_d_upper,
m.pool_a_stake,
m.pool_b_stake,
m.pool_c_stake,
m.pool_d_stake,
m.pool_e_stake,
m.total_stake,
CASE WHEN m.total_stake > 0
THEN ROUND((m.pool_a_stake / m.total_stake * 100)::NUMERIC, 2)
ELSE 0 END AS pool_a_pct,
CASE WHEN m.total_stake > 0
THEN ROUND((m.pool_b_stake / m.total_stake * 100)::NUMERIC, 2)
ELSE 0 END AS pool_b_pct,
CASE WHEN m.total_stake > 0
THEN ROUND((m.pool_c_stake / m.total_stake * 100)::NUMERIC, 2)
ELSE 0 END AS pool_c_pct,
CASE WHEN m.total_stake > 0
THEN ROUND((m.pool_d_stake / m.total_stake * 100)::NUMERIC, 2)
ELSE 0 END AS pool_d_pct,
CASE WHEN m.total_stake > 0
THEN ROUND((m.pool_e_stake / m.total_stake * 100)::NUMERIC, 2)
ELSE 0 END AS pool_e_pct,
m.winning_pool,m.settlement_price,
m.is_refund
FROM markets m;

-- Leaderboard view
CREATE OR REPLACE VIEW leaderboard AS
SELECT
u.id,
u.username,
u.avatar_url,
us.pr_score,
us.xp,
us.level,
us.total_predictions,
us.total_wins,
us.current_streak,
us.best_streak,
us.archetype,
CASE WHEN us.total_predictions > 0
THEN ROUND((us.total_wins::NUMERIC / us.total_predictions * 100), 2)
ELSE 0 END AS win_rate,
CASE WHEN us.contrarian_attempts > 0
THEN ROUND((us.contrarian_wins::NUMERIC / us.contrarian_attempts * 100), 2)
ELSE 0 END AS contrarian_win_rate,
RANK() OVER (ORDER BY us.pr_score DESC) AS global_rank
FROM users u
JOIN user_stats us ON u.id = us.user_id
WHERE us.total_predictions > 0;

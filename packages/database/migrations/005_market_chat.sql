-- ─────────────────────────────────────────────────────────────────
-- Migration 005 — Market Chat (Comments + Activity Feed)
-- ─────────────────────────────────────────────────────────────────

-- ─── MARKET COMMENTS ─────────────────────────────────────────────

CREATE TABLE market_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 280),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_market_comments_market ON market_comments(market_id, created_at DESC);
CREATE INDEX idx_market_comments_user ON market_comments(user_id);

-- ─── MARKET ACTIVITY ─────────────────────────────────────────────
-- Auto-populated via trigger when a prediction is inserted

CREATE TABLE market_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(20) NOT NULL DEFAULT 'bet', -- 'bet' | 'win' | 'claim'
  pool_id SMALLINT,
  amount NUMERIC(18,6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_market_activity_market ON market_activity(market_id, created_at DESC);

-- Auto-insert activity when prediction is placed
CREATE OR REPLACE FUNCTION on_prediction_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO market_activity (market_id, user_id, activity_type, pool_id, amount)
  VALUES (NEW.market_id, NEW.user_id, 'bet', NEW.pool_id, NEW.stake_amount);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prediction_activity
AFTER INSERT ON predictions
FOR EACH ROW EXECUTE FUNCTION on_prediction_insert();

-- ─── ENABLE REALTIME ─────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE market_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE market_activity;

-- ─── RLS POLICIES ────────────────────────────────────────────────

ALTER TABLE market_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_activity ENABLE ROW LEVEL SECURITY;

-- Comments: anyone can read, only authenticated users can insert their own
CREATE POLICY "comments_read" ON market_comments
  FOR SELECT USING (true);

CREATE POLICY "comments_insert" ON market_comments
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Activity: anyone can read (it's public feed)
CREATE POLICY "activity_read" ON market_activity
  FOR SELECT USING (true);
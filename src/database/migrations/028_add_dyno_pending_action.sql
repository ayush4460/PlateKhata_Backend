ALTER TABLE orders ADD COLUMN IF NOT EXISTS dyno_pending_action INTEGER DEFAULT 0;
-- 0: None, 1: Accept Needed, 3: Mark Ready Needed (Based on Dyno Docs)

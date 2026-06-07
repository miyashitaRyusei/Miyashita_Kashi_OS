-- ============================================
-- 作家性を表す3つの新しいスコア指標を追加
-- ============================================

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS perspective_score FLOAT DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS narrative_score FLOAT DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS cynicism_score FLOAT DEFAULT 0.0;

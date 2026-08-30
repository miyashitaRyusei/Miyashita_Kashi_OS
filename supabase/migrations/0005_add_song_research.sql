-- ChatGPT research analysis foundation.
-- Proposal only: do not apply until the live Supabase schema has been reviewed.

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS reference_tier TEXT;

ALTER TABLE songs
  ADD CONSTRAINT songs_reference_tier_check
  CHECK (reference_tier IS NULL OR reference_tier IN ('core', 'selected', 'archive'));

COMMENT ON COLUMN songs.reference_tier IS
  'Manual, song-level research priority. NULL preserves existing rows until classified.';

CREATE TABLE IF NOT EXISTS song_research_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'chatgpt'
    CHECK (source IN ('chatgpt', 'manual', 'other')),
  schema_version TEXT NOT NULL,
  title TEXT NOT NULL,
  analysis_json JSONB NOT NULL,
  prompt_version TEXT,
  model_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS research_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES song_research_analyses(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN (
    'summary_insight',
    'technique',
    'sentence_ending',
    'connection',
    'modifier',
    'notable_phrase',
    'motif',
    'structure',
    'takeaway'
  )),
  category TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  effect TEXT,
  reuse_hint TEXT,
  examples JSONB NOT NULL DEFAULT '[]'::JSONB,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  personal_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_song_research_active
  ON song_research_analyses(song_id)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_song_research_song_created
  ON song_research_analyses(song_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_research_items_song_type
  ON research_items(song_id, item_type);

CREATE INDEX IF NOT EXISTS idx_research_items_analysis
  ON research_items(analysis_id);

CREATE INDEX IF NOT EXISTS idx_research_items_tags
  ON research_items USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_research_items_examples
  ON research_items USING GIN(examples);

COMMENT ON TABLE song_research_analyses IS
  'Canonical, lossless imported research JSON. Re-imports create new rows.';
COMMENT ON TABLE research_items IS
  'Rebuildable search projection derived from song_research_analyses.analysis_json.';

-- RLS policies deliberately omitted from this proposal. They must be designed
-- after the live database roles and current policies have been inspected.

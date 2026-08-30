-- ChatGPT research analysis foundation.
-- Proposal only: inspect the live catalog before applying this migration.
-- This migration intentionally fails instead of accepting unexpected objects.

BEGIN;

DO $$
DECLARE
  conflicting_object TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'songs'
      AND column_name = 'reference_tier'
  ) THEN
    RAISE EXCEPTION 'Preflight failed: public.songs.reference_tier already exists';
  END IF;

  IF to_regclass('public.song_research_analyses') IS NOT NULL THEN
    RAISE EXCEPTION 'Preflight failed: public.song_research_analyses already exists';
  END IF;

  IF to_regclass('public.research_items') IS NOT NULL THEN
    RAISE EXCEPTION 'Preflight failed: public.research_items already exists';
  END IF;

  SELECT indexname INTO conflicting_object
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'uq_song_research_active',
      'idx_song_research_song_created',
      'idx_research_items_song_type',
      'idx_research_items_analysis',
      'idx_research_items_tags',
      'idx_research_items_examples'
    )
  LIMIT 1;
  IF conflicting_object IS NOT NULL THEN
    RAISE EXCEPTION 'Preflight failed: index public.% already exists', conflicting_object;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'songs'
      AND c.conname = 'songs_reference_tier_check'
  ) THEN
    RAISE EXCEPTION 'Preflight failed: constraint public.songs.songs_reference_tier_check already exists';
  END IF;

  SELECT p.proname INTO conflicting_object
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'set_song_research_updated_at',
      'import_song_research_analysis'
    )
  LIMIT 1;
  IF conflicting_object IS NOT NULL THEN
    RAISE EXCEPTION 'Preflight failed: function public.% already exists', conflicting_object;
  END IF;
END $$;

ALTER TABLE public.songs
  ADD COLUMN reference_tier TEXT;

ALTER TABLE public.songs
  ADD CONSTRAINT songs_reference_tier_check
  CHECK (reference_tier IS NULL OR reference_tier IN ('core', 'selected', 'archive'));

COMMENT ON COLUMN public.songs.reference_tier IS
  'Manual, song-level research priority. NULL preserves existing rows until classified.';

CREATE TABLE public.song_research_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'chatgpt',
  schema_version TEXT NOT NULL,
  title TEXT NOT NULL,
  analysis_json JSONB NOT NULL,
  prompt_version TEXT,
  model_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT song_research_analyses_song_fk
    FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE,
  CONSTRAINT song_research_analyses_source_check
    CHECK (source IN ('chatgpt', 'manual', 'other'))
);

CREATE TABLE public.research_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL,
  song_id UUID NOT NULL,
  item_type TEXT NOT NULL,
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT research_items_analysis_fk
    FOREIGN KEY (analysis_id)
    REFERENCES public.song_research_analyses(id) ON DELETE CASCADE,
  CONSTRAINT research_items_song_fk
    FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE,
  CONSTRAINT research_items_type_check
    CHECK (item_type IN (
      'summary_insight',
      'technique',
      'sentence_ending',
      'connection',
      'modifier',
      'notable_phrase',
      'motif',
      'structure',
      'takeaway'
    ))
);

CREATE UNIQUE INDEX uq_song_research_active
  ON public.song_research_analyses(song_id)
  WHERE is_active = TRUE;

CREATE INDEX idx_song_research_song_created
  ON public.song_research_analyses(song_id, created_at DESC);

CREATE INDEX idx_research_items_song_type
  ON public.research_items(song_id, item_type);

CREATE INDEX idx_research_items_analysis
  ON public.research_items(analysis_id);

CREATE INDEX idx_research_items_tags
  ON public.research_items USING GIN(tags);

CREATE INDEX idx_research_items_examples
  ON public.research_items USING GIN(examples);

CREATE FUNCTION public.set_song_research_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_song_research_updated_at
  BEFORE UPDATE ON public.song_research_analyses
  FOR EACH ROW EXECUTE FUNCTION public.set_song_research_updated_at();

CREATE TRIGGER trg_research_items_updated_at
  BEFORE UPDATE ON public.research_items
  FOR EACH ROW EXECUTE FUNCTION public.set_song_research_updated_at();

CREATE FUNCTION public.import_song_research_analysis(
  p_song_id UUID,
  p_source TEXT,
  p_schema_version TEXT,
  p_title TEXT,
  p_analysis_json JSONB,
  p_prompt_version TEXT,
  p_model_name TEXT,
  p_research_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  new_analysis_id UUID;
  saved_analysis JSONB;
BEGIN
  -- The row lock serializes imports for the same song until this transaction ends.
  PERFORM 1
  FROM public.songs
  WHERE id = p_song_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Song % does not exist', p_song_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF p_research_items IS NULL OR jsonb_typeof(p_research_items) <> 'array' THEN
    RAISE EXCEPTION 'p_research_items must be a JSON array'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO public.song_research_analyses (
    song_id,
    source,
    schema_version,
    title,
    analysis_json,
    prompt_version,
    model_name,
    is_active
  ) VALUES (
    p_song_id,
    p_source,
    p_schema_version,
    p_title,
    p_analysis_json,
    p_prompt_version,
    p_model_name,
    FALSE
  )
  RETURNING id INTO new_analysis_id;

  INSERT INTO public.research_items (
    analysis_id,
    song_id,
    item_type,
    category,
    title,
    content,
    effect,
    reuse_hint,
    examples,
    tags
  )
  SELECT
    new_analysis_id,
    p_song_id,
    item.item_type,
    item.category,
    item.title,
    item.content,
    item.effect,
    item.reuse_hint,
    COALESCE(item.examples, '[]'::JSONB),
    COALESCE(item.tags, '{}'::TEXT[])
  FROM jsonb_to_recordset(p_research_items) AS item(
    item_type TEXT,
    category TEXT,
    title TEXT,
    content TEXT,
    effect TEXT,
    reuse_hint TEXT,
    examples JSONB,
    tags TEXT[]
  );

  UPDATE public.song_research_analyses
  SET is_active = FALSE
  WHERE song_id = p_song_id
    AND is_active = TRUE;

  UPDATE public.song_research_analyses
  SET is_active = TRUE
  WHERE id = new_analysis_id;

  SELECT to_jsonb(analysis)
  INTO saved_analysis
  FROM public.song_research_analyses AS analysis
  WHERE analysis.id = new_analysis_id;

  RETURN saved_analysis;
END;
$$;

ALTER TABLE public.song_research_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.song_research_analyses FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.research_items FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.song_research_analyses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.research_items TO service_role;

REVOKE ALL ON FUNCTION public.set_song_research_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.import_song_research_analysis(
  UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_song_research_analysis(
  UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, JSONB
) TO service_role;

COMMENT ON TABLE public.song_research_analyses IS
  'Canonical, lossless imported research JSON. Re-imports create new rows.';
COMMENT ON TABLE public.research_items IS
  'Rebuildable search projection derived from song_research_analyses.analysis_json.';
COMMENT ON FUNCTION public.import_song_research_analysis(
  UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, JSONB
) IS 'Atomically imports one validated analysis and its derived search items.';

COMMIT;

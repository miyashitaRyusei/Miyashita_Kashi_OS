-- Read-only preflight for migration 0005.
-- Run manually in the Supabase Dashboard SQL Editor and return all rows to Codex.

WITH expected(category, object_name) AS (
  VALUES
    ('column', 'songs.reference_tier'),
    ('table', 'song_research_analyses'),
    ('table', 'research_items'),
    ('constraint', 'songs_reference_tier_check'),
    ('index', 'uq_song_research_active'),
    ('index', 'idx_song_research_song_created'),
    ('index', 'idx_research_items_song_type'),
    ('index', 'idx_research_items_analysis'),
    ('index', 'idx_research_items_tags'),
    ('index', 'idx_research_items_examples'),
    ('trigger', 'trg_song_research_updated_at'),
    ('trigger', 'trg_research_items_updated_at'),
    ('function', 'set_song_research_updated_at'),
    ('rpc', 'import_song_research_analysis')
),
actual AS (
  SELECT
    'column'::TEXT AS category,
    'songs.' || column_name AS object_name,
    jsonb_build_object(
      'data_type', data_type,
      'udt_name', udt_name,
      'is_nullable', is_nullable,
      'column_default', column_default
    ) AS details
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'songs'
    AND column_name = 'reference_tier'

  UNION ALL

  SELECT
    'table',
    c.relname,
    jsonb_build_object('relkind', c.relkind, 'owner', owner_role.rolname)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_roles owner_role ON owner_role.oid = c.relowner
  WHERE n.nspname = 'public'
    AND c.relname IN ('song_research_analyses', 'research_items')

  UNION ALL

  SELECT
    'constraint',
    constraint_row.conname,
    jsonb_build_object(
      'table', table_row.relname,
      'definition', pg_get_constraintdef(constraint_row.oid)
    )
  FROM pg_constraint constraint_row
  JOIN pg_class table_row ON table_row.oid = constraint_row.conrelid
  JOIN pg_namespace n ON n.oid = table_row.relnamespace
  WHERE n.nspname = 'public'
    AND table_row.relname = 'songs'
    AND constraint_row.conname = 'songs_reference_tier_check'

  UNION ALL

  SELECT
    'index',
    indexname,
    jsonb_build_object('table', tablename, 'definition', indexdef)
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

  UNION ALL

  SELECT
    'trigger',
    trigger_name,
    jsonb_build_object(
      'table', event_object_table,
      'timing', action_timing,
      'event', event_manipulation,
      'statement', action_statement
    )
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
    AND trigger_name IN (
      'trg_song_research_updated_at',
      'trg_research_items_updated_at'
    )

  UNION ALL

  SELECT
    CASE WHEN procedure_row.proname = 'import_song_research_analysis'
      THEN 'rpc' ELSE 'function' END,
    procedure_row.proname,
    jsonb_build_object(
      'identity_arguments', pg_get_function_identity_arguments(procedure_row.oid),
      'result', pg_get_function_result(procedure_row.oid),
      'security_definer', procedure_row.prosecdef,
      'owner', owner_role.rolname,
      'acl', procedure_row.proacl
    )
  FROM pg_proc procedure_row
  JOIN pg_namespace n ON n.oid = procedure_row.pronamespace
  JOIN pg_roles owner_role ON owner_role.oid = procedure_row.proowner
  WHERE n.nspname = 'public'
    AND procedure_row.proname IN (
      'set_song_research_updated_at',
      'import_song_research_analysis'
    )
)
SELECT
  expected.category,
  expected.object_name,
  CASE WHEN actual.object_name IS NULL THEN 'absent' ELSE 'present' END AS status,
  COALESCE(actual.details, '{}'::JSONB) AS details
FROM expected
LEFT JOIN actual
  ON actual.category = expected.category
 AND actual.object_name = expected.object_name
ORDER BY
  CASE expected.category
    WHEN 'column' THEN 1
    WHEN 'table' THEN 2
    WHEN 'constraint' THEN 3
    WHEN 'index' THEN 4
    WHEN 'trigger' THEN 5
    WHEN 'function' THEN 6
    WHEN 'rpc' THEN 7
    ELSE 8
  END,
  expected.object_name;

-- ============================================
-- みやした歌詞OS — Supabaseテーブル設計
-- ============================================
-- Supabaseの SQL Editor にこのSQLを貼り付けて実行してください。

-- 1. songs テーブル（楽曲メタデータ + 分析結果）
CREATE TABLE IF NOT EXISTS songs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    song_id TEXT NOT NULL UNIQUE,           -- アプリ内部ID
    title TEXT NOT NULL,                     -- 楽曲タイトル
    artist TEXT NOT NULL,                    -- アーティスト名
    evaluation_tag TEXT DEFAULT 'like',      -- 評価タグ (like / dislike / neutral)
    
    -- マクロ指標（Python解析結果）
    noun_ratio REAL DEFAULT 0,
    verb_ratio REAL DEFAULT 0,
    adjective_ratio REAL DEFAULT 0,
    pos_ratios JSONB DEFAULT '{}',           -- 全品詞比率のJSON
    first_person_count INTEGER DEFAULT 0,
    second_person_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    
    -- LLM解析結果（平均値）
    concreteness_score REAL DEFAULT 3.0,
    
    -- セクション別の詳細データ（JSON配列）
    sections JSONB DEFAULT '[]',
    
    -- メタデータ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. phrase_stock テーブル（ストック辞書用）
CREATE TABLE IF NOT EXISTS phrase_stock (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    song_id TEXT REFERENCES songs(song_id) ON DELETE CASCADE,
    section_name TEXT,
    stock_type TEXT NOT NULL,                -- 'phrase_start', 'phrase_end', 'rhetoric'
    phrase TEXT NOT NULL,                     -- フレーズ本文
    rhetoric_type TEXT,                      -- レトリック種別（意味的摩擦, 倒置法 等）
    reason TEXT,                             -- 判定理由
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS (Row Level Security) は開発中は無効にしておく
-- ※本番運用時はRLSを有効にしてください
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE phrase_stock ENABLE ROW LEVEL SECURITY;

-- 開発用: 全アクセス許可ポリシー
CREATE POLICY "Allow all access to songs" ON songs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to phrase_stock" ON phrase_stock FOR ALL USING (true) WITH CHECK (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_songs_evaluation_tag ON songs(evaluation_tag);
CREATE INDEX IF NOT EXISTS idx_phrase_stock_type ON phrase_stock(stock_type);
CREATE INDEX IF NOT EXISTS idx_phrase_stock_song_id ON phrase_stock(song_id);

-- 4. idea_seeds テーブル（アイデアの種、マイフレーズ・単語集用）
CREATE TABLE IF NOT EXISTS idea_seeds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,                     -- 浮かんだ言葉・フレーズ
    category TEXT DEFAULT '単語',             -- カテゴリ ('単語' or 'フレーズ')
    memo TEXT,                                 -- メモ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE idea_seeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to idea_seeds" ON idea_seeds FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_idea_seeds_category ON idea_seeds(category);

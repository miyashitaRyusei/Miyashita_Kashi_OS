-- 1. songs テーブル (楽曲の全体データ)
CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    bpm INT,
    sentiment_score FLOAT,
    abstract_balance_score INT,
    information_density FLOAT,
    colloquial_level TEXT,  -- "colloquial" | "intermediate" | "poetic"
    analysis_status TEXT DEFAULT 'completed', -- "processing" | "completed" | "error"
    is_liked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. sections テーブル (セクション単位のデータ)
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL, -- 例: '1A', '1B', 'Chorus', 'Bridge'
    total_mora INT NOT NULL DEFAULT 0,
    sentiment_score FLOAT,
    noun_density FLOAT,
    verb_density FLOAT,
    adj_density FLOAT,
    adv_density FLOAT,
    content_word_density FLOAT,
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. lines テーブル (行単位のデータ)
CREATE TABLE lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    line_number INT NOT NULL,
    text TEXT NOT NULL,
    mora_count INT NOT NULL DEFAULT 0,
    end_vowel TEXT,
    prose_text TEXT,  -- Geminiによる散文翻訳（行単位）
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. sentence_endings テーブル (文末表現のストック・辞書用)
CREATE TABLE sentence_endings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ending_text TEXT NOT NULL,
    category TEXT,
    appearance_count INT NOT NULL DEFAULT 0,
    examples TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. lyric_rules テーブル (抽出された作詞ルールのストック)
CREATE TABLE lyric_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL,
    is_novel BOOLEAN DEFAULT false,
    examples TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. rhetoric テーブル (抽出されたレトリック・修辞技法)
CREATE TABLE rhetoric (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    type TEXT NOT NULL,       -- "意味的摩擦" | "高度な省略" | "高度な比喩" | "象徴" | "対比"
    phrase TEXT NOT NULL,     -- 該当フレーズ
    reason TEXT,              -- 注目に値する理由
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 検索・フィルタリング用のインデックス作成
CREATE INDEX idx_sections_song_id ON sections(song_id);
CREATE INDEX idx_lines_section_id ON lines(section_id);
CREATE INDEX idx_rhetoric_section_id ON rhetoric(section_id);

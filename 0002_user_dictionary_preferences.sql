-- ============================================
-- 辞書・ルールの個別お気に入り・削除管理テーブル
-- ============================================

CREATE TABLE IF NOT EXISTS user_dictionary_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_type TEXT NOT NULL CHECK (item_type IN ('phrase', 'rule', 'ending')),
  item_key TEXT NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_type, item_key)
);

-- ============================================
-- RLS (Row Level Security) の設定
-- ============================================

-- RLSを有効化
ALTER TABLE user_dictionary_preferences ENABLE ROW LEVEL SECURITY;

-- 匿名アクセス（全ユーザー）に対するSELECTを許可
CREATE POLICY "Allow public read access for dictionary_prefs"
ON user_dictionary_preferences FOR SELECT
USING (true);

-- 匿名アクセス（全ユーザー）に対するINSERTを許可
CREATE POLICY "Allow public insert for dictionary_prefs"
ON user_dictionary_preferences FOR INSERT
WITH CHECK (true);

-- 匿名アクセス（全ユーザー）に対するUPDATEを許可
CREATE POLICY "Allow public update for dictionary_prefs"
ON user_dictionary_preferences FOR UPDATE
USING (true);

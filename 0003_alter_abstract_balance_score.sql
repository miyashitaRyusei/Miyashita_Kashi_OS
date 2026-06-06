-- ============================================
-- 抽象/具体スコアを少数点対応（FLOAT）に変更
-- ============================================

ALTER TABLE songs ALTER COLUMN abstract_balance_score TYPE FLOAT;
ALTER TABLE sections ALTER COLUMN abstract_balance_score TYPE FLOAT;

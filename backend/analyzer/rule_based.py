"""
rule_based.py — Python側の計量・構造分析モジュール

MeCab/Janomeによる形態素解析、pykakasiによるモーラ・母音解析を担当。
LLMには一切依存せず、確実な数値データを返す。
"""

import re
from janome.tokenizer import Tokenizer
from pykakasi import kakasi

# --- Janome トークナイザー（シングルトン） ---
_tokenizer = Tokenizer()

# --- pykakasi 変換器（シングルトン） ---
_kakasi = kakasi()
_kakasi.setMode("H", "a")  # ひらがな → ローマ字
_kakasi.setMode("K", "a")  # カタカナ → ローマ字
_kakasi.setMode("J", "a")  # 漢字 → ローマ字
_converter = _kakasi.getConverter()

# --- 定数定義 ---
FIRST_PERSON_WORDS = {
    "僕", "ぼく", "ボク",
    "私", "わたし", "ワタシ", "あたし", "アタシ",
    "俺", "おれ", "オレ",
    "あたい", "うち", "ウチ",
    "自分", "わし",
}

SECOND_PERSON_WORDS = {
    "君", "きみ", "キミ",
    "あなた", "アナタ",
    "お前", "おまえ", "オマエ",
    "あんた", "アンタ",
    "てめえ", "テメエ",
}

# 品詞の大分類マッピング
POS_CATEGORIES = {
    "名詞": "noun",
    "動詞": "verb",
    "形容詞": "adjective",
    "副詞": "adverb",
    "助詞": "particle",
    "助動詞": "auxiliary_verb",
    "接続詞": "conjunction",
    "感動詞": "interjection",
}

# 拗音（小さい「ゃゅょ」等）— モーラ数に影響
SMALL_KANA = set("ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ")

# 母音の抽出用パターン
VOWEL_PATTERN = re.compile(r"[aiueo]")


class RuleBasedAnalyzer:
    """Python側の計量・構造分析を行うクラス"""

    # ========================================
    # マクロ分析（楽曲全体を対象）
    # ========================================
    def analyze_macro(self, lyrics_all: str) -> dict:
        """
        楽曲全体の歌詞を受け取り、品詞割合・人称カウント等を返す。
        """
        tokens = list(_tokenizer.tokenize(lyrics_all))

        # --- 品詞カウント ---
        pos_counts = {}
        total_content_tokens = 0
        first_person_count = 0
        second_person_count = 0

        for token in tokens:
            surface = token.surface
            part_of_speech = token.part_of_speech.split(",")[0]  # 大分類

            # 品詞カウント
            eng_pos = POS_CATEGORIES.get(part_of_speech, "other")
            pos_counts[eng_pos] = pos_counts.get(eng_pos, 0) + 1
            total_content_tokens += 1

            # 一人称・二人称カウント
            if surface in FIRST_PERSON_WORDS:
                first_person_count += 1
            if surface in SECOND_PERSON_WORDS:
                second_person_count += 1

        # 品詞比率の計算
        pos_ratios = {}
        if total_content_tokens > 0:
            for pos, count in pos_counts.items():
                pos_ratios[f"{pos}_ratio"] = round(count / total_content_tokens, 4)

        return {
            "pos_ratios": pos_ratios,
            "noun_ratio": pos_ratios.get("noun_ratio", 0),
            "verb_ratio": pos_ratios.get("verb_ratio", 0),
            "adjective_ratio": pos_ratios.get("adjective_ratio", 0),
            "first_person_count": first_person_count,
            "second_person_count": second_person_count,
            "total_tokens": total_content_tokens,
        }

    # ========================================
    # セクション分析（セクション単位）
    # ========================================
    def analyze_section(self, lyrics: str) -> dict:
        """
        セクション単位の歌詞を受け取り、モーラ数・母音配列、および情報密度を返す。
        """
        lines = [line for line in lyrics.split("\n") if line.strip()]

        mora_counts = []
        vowels_per_line = []
        end_vowels = []
        
        # 情報密度計算用の変数
        total_section_mora = 0
        target_pos_count = 0  # 名詞 + 動詞 の数

        for line in lines:
            # モーラ数カウント
            mora = self._count_mora(line)
            mora_counts.append(mora)
            total_section_mora += mora

            # 母音配列の抽出
            line_vowels = self._extract_vowels(line)
            vowels_per_line.append(line_vowels)

            # 末尾母音（韻の判定用）
            if line_vowels:
                end_vowels.append(line_vowels[-1])
            else:
                end_vowels.append("")
                
            # 行ごとの形態素解析で名詞・動詞をカウント
            tokens = list(_tokenizer.tokenize(line))
            for token in tokens:
                pos = token.part_of_speech.split(",")[0]
                if pos in ("名詞", "動詞"):
                    target_pos_count += 1
                    
        # 情報密度の算出（改行という休符を無視した物理的な情報量）
        # 例: (名詞+動詞) / 総モーラ数。モーラが0の場合は0。
        information_density = round(target_pos_count / total_section_mora, 4) if total_section_mora > 0 else 0.0

        return {
            "mora_counts": mora_counts,
            "vowels": vowels_per_line,
            "end_vowels": end_vowels,
            "information_density": information_density,
        }

    # ========================================
    # 内部ヘルパー関数
    # ========================================
    def _count_mora(self, text: str) -> int:
        """
        テキストのモーラ数をカウントする。
        日本語のモーラは基本的に「かな1文字＝1モーラ」だが、
        拗音（ゃゅょ等の小書き仮名）は前の文字と合わせて1モーラ。
        """
        # 漢字混じり → ひらがなに変換
        hiragana = self._to_hiragana(text)

        # スペース・記号を除去
        hiragana = re.sub(r"[^\u3040-\u309F\u30A0-\u30FFー]", "", hiragana)

        mora_count = 0
        for char in hiragana:
            if char in SMALL_KANA:
                # 小さい仮名は前の文字と合わせて1モーラなのでカウントしない
                continue
            mora_count += 1

        return mora_count

    def _to_hiragana(self, text: str) -> str:
        """漢字・カタカナ混じりのテキストをひらがなに変換する"""
        # pykakasiでローマ字に変換してからひらがなに戻すより、
        # Janomeの読みを使う方が精度が高い
        result = []
        tokens = _tokenizer.tokenize(text)
        for token in tokens:
            reading = token.reading
            if reading and reading != "*":
                # カタカナ → ひらがな
                hira = ""
                for ch in reading:
                    code = ord(ch)
                    if 0x30A0 <= code <= 0x30FF:
                        hira += chr(code - 0x60)  # カタカナ→ひらがな
                    else:
                        hira += ch
                result.append(hira)
            else:
                result.append(token.surface)
        return "".join(result)

    def _extract_vowels(self, text: str) -> list:
        """
        テキストをローマ字に変換し、母音（a, i, u, e, o）の配列を返す。
        """
        romaji = _converter.do(text)
        # ローマ字から母音のみを抽出
        vowels = VOWEL_PATTERN.findall(romaji.lower())
        return vowels

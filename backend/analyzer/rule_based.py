"""
rule_based.py — Python側の計量・構造分析モジュール

Janomeによる形態素解析と自前アルゴリズムを用いて、
楽曲を「セクション → 行」の粒度で計量分析する。
LLMには一切依存せず、確実な数値データを返す。

Phase 1 で定義した DB スキーマ (songs, sections, lines, sentence_endings)
にマッピング可能なデータ構造を出力する。
"""

import re
from typing import Optional
from pydantic import BaseModel
import fugashi
import ipadic


# ============================================
# Pydantic モデル定義
# ============================================

class LineResult(BaseModel):
    """1行分の解析結果。DB の lines テーブルに対応する。"""
    line_number: int
    text: str
    mora_count: int
    end_vowel: Optional[str] = None


class SentenceEndingResult(BaseModel):
    """行末から切り出した文末表現。後で Gemini に分類させるための素材。"""
    ending_text: str    # 例: "だ", "かもしれない", "のに"
    source_line: str    # 抽出元の行テキスト（デバッグ・確認用）


class PhraseResult(BaseModel):
    """書き出し・書き終わりのフレーズ抽出結果"""
    phrase_type: str    # "start" or "end"
    text: str           # フレーズ本体
    source_line: str    # 抽出元の行


class SectionResult(BaseModel):
    """1セクション分の解析結果。DB の sections テーブルに対応する。"""
    section_type: str           # 例: '1A', '1B', 'Chorus', 'Bridge'
    order_index: int            # セクションの出現順序 (0-indexed)
    total_mora: int
    # 5つの密度（各品詞カウント ÷ 総モーラ数）
    noun_density: float
    verb_density: float
    adj_density: float
    adv_density: float
    content_word_density: float  # 名詞+動詞+形容詞+副詞 の合計密度
    # 子要素
    lines: list[LineResult]
    sentence_endings: list[SentenceEndingResult]
    phrases: list[PhraseResult]


class SongAnalysisResult(BaseModel):
    """楽曲全体のルールベース解析結果。main.py から呼ばれる最終出力。"""
    information_density: float  # 楽曲全体の情報密度（全セクションの加重平均）
    sections: list[SectionResult]


# ============================================
# 定数定義
# ============================================

# Fugashi トークナイザー（シングルトン）
_tokenizer = fugashi.GenericTagger(ipadic.MECAB_ARGS)

# 拗音（小さい「ゃゅょ」等）— モーラ数に影響
SMALL_KANA = set("ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ")

# カタカナ → 母音 マッピング（母音配列抽出用）
VOWEL_MAP = {
    "ア": "a", "カ": "a", "サ": "a", "タ": "a", "ナ": "a", "ハ": "a", "マ": "a", "ヤ": "a", "ラ": "a", "ワ": "a", "ガ": "a", "ザ": "a", "ダ": "a", "バ": "a", "パ": "a", "ァ": "a", "ャ": "a",
    "イ": "i", "キ": "i", "シ": "i", "チ": "i", "ニ": "i", "ヒ": "i", "ミ": "i", "リ": "i", "ギ": "i", "ジ": "i", "ヂ": "i", "ビ": "i", "ピ": "i", "ィ": "i",
    "ウ": "u", "ク": "u", "ス": "u", "ツ": "u", "ヌ": "u", "フ": "u", "ム": "u", "ユ": "u", "ル": "u", "グ": "u", "ズ": "u", "ヅ": "u", "ブ": "u", "プ": "u", "ゥ": "u", "ュ": "u", "ヴ": "u",
    "エ": "e", "ケ": "e", "セ": "e", "テ": "e", "ネ": "e", "ヘ": "e", "メ": "e", "レ": "e", "ゲ": "e", "ゼ": "e", "デ": "e", "ベ": "e", "ペ": "e", "ェ": "e",
    "オ": "o", "コ": "o", "ソ": "o", "ト": "o", "ノ": "o", "ホ": "o", "モ": "o", "ヨ": "o", "ロ": "o", "ヲ": "o", "ゴ": "o", "ゾ": "o", "ド": "o", "ボ": "o", "ポ": "o", "ォ": "o", "ョ": "o",
    "ン": "n",
}

# 文末表現として拾う品詞の大分類
_ENDING_POS_TARGETS = {"助詞", "助動詞"}

# 句読点・記号（文末表現の抽出時にスキップする）
_PUNCTUATION_RE = re.compile(r"^[。、！？!?…・\s　]+$")


# ============================================
# メインクラス
# ============================================

class RuleBasedAnalyzer:
    """Phase 1 の DB スキーマに対応したデータを抽出する計量分析クラス"""

    # ===================================================
    # 公開API: 楽曲全体のエントリポイント
    # ===================================================

    def analyze_song(
        self,
        sections_input: list[dict],
    ) -> SongAnalysisResult:
        """
        楽曲全体を解析する。

        Args:
            sections_input: フロントエンドから渡されるセクションのリスト。
                各要素は {"section_name": "1A", "lyrics_raw": "..."} の形式。

        Returns:
            SongAnalysisResult: 全セクションの解析結果と楽曲全体の情報密度。
        """
        section_results: list[SectionResult] = []

        for idx, sec in enumerate(sections_input):
            section_type = sec.get("section_name", f"Section{idx + 1}")
            lyrics_raw = sec.get("lyrics_raw", "")
            result = self.analyze_section(
                section_type=section_type,
                order_index=idx,
                section_text=lyrics_raw,
            )
            section_results.append(result)

        # 楽曲全体の情報密度を算出（セクションごとのモーラ数で加重平均）
        total_mora_all = sum(s.total_mora for s in section_results)
        if total_mora_all > 0:
            weighted_density = sum(
                s.content_word_density * s.total_mora
                for s in section_results
            )
            information_density = round(weighted_density / total_mora_all, 4)
        else:
            information_density = 0.0

        return SongAnalysisResult(
            information_density=information_density,
            sections=section_results,
        )

    # ===================================================
    # セクションレベルの解析
    # ===================================================

    def analyze_section(
        self,
        section_type: str,
        order_index: int,
        section_text: str,
    ) -> SectionResult:
        """
        セクション単位の解析を行う。

        処理フロー:
        1. section_text を改行で行分割
        2. 各行を analyze_line() で解析 → LineResult のリスト
        3. 各行から文末表現を extract_sentence_ending() で抽出
        4. _calc_densities() で5種類の品詞密度を算出
        5. SectionResult にまとめて返却
        """
        raw_lines = [line for line in section_text.split("\n") if line.strip()]

        # 行単位の解析
        line_results: list[LineResult] = []
        for i, line_text in enumerate(raw_lines):
            line_result = self.analyze_line(line_number=i + 1, text=line_text)
            line_results.append(line_result)

        # 文末表現とフレーズの抽出
        sentence_endings: list[SentenceEndingResult] = []
        phrases: list[PhraseResult] = []
        for line_text in raw_lines:
            ending = self.extract_sentence_ending(line_text)
            if ending is not None:
                sentence_endings.append(ending)
            
            line_phrases = self.extract_phrases(line_text)
            phrases.extend(line_phrases)

        # 総モーラ数
        total_mora = sum(lr.mora_count for lr in line_results)

        # 5つの品詞密度を算出
        densities = self._calc_densities(section_text, total_mora)

        return SectionResult(
            section_type=section_type,
            order_index=order_index,
            total_mora=total_mora,
            noun_density=densities["noun_density"],
            verb_density=densities["verb_density"],
            adj_density=densities["adj_density"],
            adv_density=densities["adv_density"],
            content_word_density=densities["content_word_density"],
            lines=line_results,
            sentence_endings=sentence_endings,
            phrases=phrases,
        )

    # ===================================================
    # 行レベルの解析
    # ===================================================

    def analyze_line(
        self,
        line_number: int,
        text: str,
    ) -> LineResult:
        """
        行単位の解析を行う。

        Args:
            line_number: 行番号 (1-indexed)
            text: 行のテキスト

        Returns:
            LineResult: モーラ数と末尾母音を含む行解析結果
        """
        mora_count = self._count_mora(text)
        end_vowel = self._extract_end_vowel(text)

        return LineResult(
            line_number=line_number,
            text=text.strip(),
            mora_count=mora_count,
            end_vowel=end_vowel,
        )

    # ===================================================
    # フレーズ（書き出し・書き終わり）の抽出
    # ===================================================

    def extract_phrases(self, text: str) -> list[PhraseResult]:
        """
        行から「書き出し」と「書き終わり」のチャンク（自立語＋付属語）を抽出する。
        """
        stripped = text.strip()
        if not stripped:
            return []

        tokens = _tokenizer(stripped)
        if not tokens:
            return []

        def is_independent(token) -> bool:
            features = token.feature
            pos_major = features[0]
            pos_minor = features[1] if len(features) > 1 else ""
            if pos_major in {"名詞", "動詞", "形容詞", "副詞", "連体詞", "感動詞", "接続詞", "接頭詞"}:
                if pos_minor in {"非自立", "接尾"}:
                    return False
                return True
            return False

        phrases = []

        # --- 書き出し (start) 抽出 ---
        start_parts = []
        started = False
        for token in tokens:
            if is_independent(token):
                if started:
                    # 2つ目の自立語に到達したので終了
                    break
                else:
                    started = True
                    start_parts.append(token.surface)
            else:
                if started:
                    start_parts.append(token.surface)
                # 最初の自立語が来る前の記号や助詞は無視（あるいは含めてもいいが、今回は無視）
        
        start_text = "".join(start_parts)
        # 記号除去
        start_text = _PUNCTUATION_RE.sub("", start_text).strip()
        if start_text:
            phrases.append(PhraseResult(phrase_type="start", text=start_text, source_line=stripped))

        # --- 書き終わり (end) 抽出 ---
        end_parts = []
        for token in reversed(tokens):
            end_parts.append(token.surface)
            if is_independent(token):
                break
        
        end_text = "".join(reversed(end_parts))
        end_text = _PUNCTUATION_RE.sub("", end_text).strip()
        # 書き出しと書き終わりが完全に一致する場合（1語しかない等）は重複を避ける
        if end_text and end_text != start_text:
            phrases.append(PhraseResult(phrase_type="end", text=end_text, source_line=stripped))

        return phrases

    # ===================================================
    # 文末表現の抽出
    # ===================================================

    def extract_sentence_ending(
        self,
        text: str,
    ) -> Optional[SentenceEndingResult]:
        """
        行末から文末表現（終助詞・助動詞の連続）を切り出す。

        アルゴリズム:
        1. Janome で形態素解析し、トークンを逆順に走査
        2. 句読点・記号をスキップ
        3. 助詞・助動詞が連続する部分を末尾から収集
        4. 連続が途切れた時点で収集を終了し、結合して返す

        例:
            "夢を見ていたのに"  → "のに"
            "走り出した"        → "た"
            "どこへ行くの？"    → "の"
            "青い空"            → None（助詞・助動詞で終わっていない）
        """
        stripped = text.strip()
        if not stripped:
            return None

        tokens = _tokenizer(stripped)
        if not tokens:
            return None

        # 末尾から走査し、文末表現パーツを収集
        ending_parts: list[str] = []

        for token in reversed(tokens):
            surface = token.surface
            features = token.feature
            pos_major = features[0]

            # 句読点・記号はスキップして次のトークンを見る
            if _PUNCTUATION_RE.match(surface):
                continue
            # 記号品詞もスキップ
            if pos_major == "記号":
                continue

            # 助詞 or 助動詞 → 文末表現パーツとして収集
            if pos_major in _ENDING_POS_TARGETS:
                ending_parts.append(surface)
            else:
                # 助詞・助動詞以外に到達 → 収集終了
                break

        if not ending_parts:
            return None

        # 逆順で集めたので元の順番に戻して結合
        ending_text = "".join(reversed(ending_parts))

        return SentenceEndingResult(
            ending_text=ending_text,
            source_line=stripped,
        )

    # ===================================================
    # 内部ヘルパー: モーラ数カウント
    # ===================================================

    def _count_mora(self, text: str) -> int:
        """
        テキストのモーラ数をカウントする。
        日本語のモーラは基本的に「かな1文字＝1モーラ」だが、
        拗音（ゃゅょ等の小書き仮名）は前の文字と合わせて1モーラ。
        """
        hiragana = self._to_hiragana(text)

        # スペース・記号を除去（ひらがな・カタカナ・長音符のみ残す）
        hiragana = re.sub(r"[^\u3040-\u309F\u30A0-\u30FFー]", "", hiragana)

        mora_count = 0
        for char in hiragana:
            if char in SMALL_KANA:
                # 小さい仮名は前の文字と合わせて1モーラなのでカウントしない
                continue
            mora_count += 1

        return mora_count

    # ===================================================
    # 内部ヘルパー: ひらがな変換
    # ===================================================

    def _to_hiragana(self, text: str) -> str:
        """漢字・カタカナ混じりのテキストをひらがなに変換する（Janomeの読みを利用）"""
        result = []
        tokens = _tokenizer(text)
        for token in tokens:
            features = token.feature
            reading = features[7] if len(features) > 7 else "*"
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

    # ===================================================
    # 内部ヘルパー: 母音配列の抽出（将来拡張用に維持）
    # ===================================================

    def _extract_vowels(self, text: str) -> list[str]:
        """
        Janomeの読み仮名（カタカナ）を利用して母音配列を抽出する。
        将来的な母音比率分析などへの拡張に備えて維持する。
        """
        vowels: list[str] = []
        tokens = _tokenizer(text)
        for token in tokens:
            features = token.feature
            reading = features[7] if len(features) > 7 else "*"
            if reading and reading != "*":
                for ch in reading:
                    if ch in VOWEL_MAP:
                        vowels.append(VOWEL_MAP[ch])
        return vowels

    # ===================================================
    # 内部ヘルパー: 末尾母音の抽出
    # ===================================================

    def _extract_end_vowel(self, text: str) -> Optional[str]:
        """
        行末の母音を1文字抽出する。
        _extract_vowels() で得た母音配列の末尾要素を返す。
        母音が1つも抽出できない場合は None を返す。
        """
        vowels = self._extract_vowels(text)
        if vowels:
            return vowels[-1]
        return None

    # ===================================================
    # 内部ヘルパー: 5種類の品詞密度算出
    # ===================================================

    def _calc_densities(
        self, section_text: str, total_mora: int
    ) -> dict[str, float]:
        """
        Janomeで品詞分解し、5つの密度（各品詞カウント ÷ 総モーラ数）を算出する。

        算出する密度:
        - noun_density:         名詞の出現数 ÷ 総モーラ数
        - verb_density:         動詞の出現数 ÷ 総モーラ数
        - adj_density:          形容詞の出現数 ÷ 総モーラ数
        - adv_density:          副詞の出現数 ÷ 総モーラ数
        - content_word_density: 上記4品詞の合計出現数 ÷ 総モーラ数

        総モーラ数が0の場合、全ての密度は0.0を返す。
        """
        if total_mora == 0:
            return {
                "noun_density": 0.0,
                "verb_density": 0.0,
                "adj_density": 0.0,
                "adv_density": 0.0,
                "content_word_density": 0.0,
            }

        # 品詞ごとのカウント
        noun_count = 0
        verb_count = 0
        adj_count = 0
        adv_count = 0

        tokens = _tokenizer(section_text)
        for token in tokens:
            features = token.feature
            pos_major = features[0]
            if pos_major == "名詞":
                noun_count += 1
            elif pos_major == "動詞":
                verb_count += 1
            elif pos_major == "形容詞":
                adj_count += 1
            elif pos_major == "副詞":
                adv_count += 1

        content_total = noun_count + verb_count + adj_count + adv_count

        return {
            "noun_density": round(noun_count / total_mora, 4),
            "verb_density": round(verb_count / total_mora, 4),
            "adj_density": round(adj_count / total_mora, 4),
            "adv_density": round(adv_count / total_mora, 4),
            "content_word_density": round(content_total / total_mora, 4),
        }

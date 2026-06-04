"""
llm_analyzer.py — Gemini 2.5 Flash によるLLM推論・解釈モジュール

Phase 2 の RuleBasedAnalyzer が出力した計量データを受け取り、
Gemini 2.5 Flash で「散文翻訳」「レトリック抽出」「メタデータ推論」
「文末表現分類」「作詞ルール抽出」を行う。

2段階のAPIコールで構成:
  ① セクション分析 (analyze_section_with_llm): セクション数 × 1回
  ② 楽曲全体分析 (analyze_song_with_llm): 1回
"""

import json
import os
import time
import traceback
from typing import Optional

from google import genai
from pydantic import BaseModel


# ============================================
# Pydantic モデル定義 (Gemini の response_schema 用)
# ============================================

# --- ① セクション分析レスポンス ---

class ProseLineResult(BaseModel):
    """元の歌詞1行に対応する散文翻訳。"""
    line_number: int        # 行番号 (1-indexed、LineResult と対応)
    original_text: str      # 元の歌詞テキスト
    prose_text: str         # 主語補完・倒置解消済みの論理的な散文


class RhetoricResult(BaseModel):
    """高度な修辞技法のみを厳選して抽出した結果。"""
    type: str               # "意味的摩擦" | "高度な省略" | "高度な比喩" | "象徴" | "対比"
    phrase: str             # 該当フレーズ
    reason: str             # なぜ注目に値するかの簡潔な理由


class SectionLLMResponse(BaseModel):
    """Gemini APIコール①の戻り値。セクション単位。"""
    sentiment_score: float          # -1.0（絶望・悲哀）〜 1.0（歓喜・高揚）
    timeline: str                   # "past" | "present" | "future" | "mixed"
    abstract_balance_score: int     # 1〜4
    colloquial_level: str           # "colloquial" | "intermediate" | "poetic"
    prose_lines: list[ProseLineResult]
    rhetoric: list[RhetoricResult]  # 最大3つ


# --- ② 楽曲全体分析レスポンス ---

class EndingClassification(BaseModel):
    """Python側が抽出した文末表現に対するGeminiの分類結果。"""
    ending_text: str        # Phase 2で抽出された文末表現テキスト
    category: str           # "断定" | "否定" | "疑問" | "願望" | "体言止め" | "未完了" | "余韻"


class ExtractedRule(BaseModel):
    """楽曲から抽出された「真似できる作詞ルール」。"""
    rule_name: str          # ルール名（例: "サビ前の体言止め連打"）
    examples: list[str]     # 根拠フレーズのリスト
    is_novel: bool          # 既存ルール一覧に無い完全新規ルールか


class SongLLMResponse(BaseModel):
    """Gemini APIコール②の戻り値。楽曲全体。"""
    sentiment_score: float          # -1.0（絶望・悲哀）〜 1.0（歓喜・高揚）
    timeline: str                   # "past" | "present" | "future" | "mixed"
    abstract_balance_score: int     # 1〜4
    colloquial_level: str           # "colloquial" | "intermediate" | "poetic"
    ending_classifications: list[EndingClassification]
    extracted_rules: list[ExtractedRule]


# ============================================
# プロンプトテンプレート
# ============================================

SECTION_ANALYSIS_PROMPT = """あなたはプロの作詞アナリストです。
以下のルールに厳密に従い、歌詞セクションを分析してください。

## セクションのメタデータ推論ルール
このセクション単体に限った以下の4つの指標を評価してください。
- sentiment_score: セクションの感情極性を -1.0（絶望・悲哀）〜 1.0（歓喜・高揚）の小数で判定すること。
- timeline: セクションが主に描いている時間軸を "past" | "present" | "future" | "mixed" から1つ選ぶこと。
- abstract_balance_score: セクションの抽象/具体バランスを 1（抽象的）〜 4（具象的）の整数で判定すること。
  - 1: ほぼ抽象的な概念・感情のみ
  - 2: 抽象寄りだが一部に具体的な描写
  - 3: 具体的な情景が多いが抽象も混在
  - 4: ほぼ具象的な描写のみ
- colloquial_level: セクションの言葉遣いの口語度を判定すること。
  - "colloquial": 話し言葉に近い
  - "intermediate": 話し言葉と書き言葉の中間
  - "poetic": 文語・詩的表現が主体

## 散文翻訳ルール (prose_lines)
- 元の歌詞の「1行」に対して、必ず「1行」の散文を出力すること。行数は完全に一致させること。
- 散文は「省略された主語や目的語を補い、倒置や比喩を解消した、文法的に正しい論理的な文」にすること。
- 元の歌詞が感嘆詞のみ（例: "Ah"、"La la la"）の場合は、そのまま転記すること。

## レトリック抽出ルール (rhetoric)
- 散文翻訳と元の歌詞を比較し、「差分」として浮かび上がる修辞技法を抽出すること。
- ただし、ありふれた倒置（例: 目的語が先に来ただけ）は無視すること。
- 「意味的摩擦（本来共起しない語の組み合わせ）」「高度な省略」「高度な比喩」「象徴」「対比」のみを厳選し、最大3つまでに絞ること。
- 該当するものが無い場合は空配列を返すこと。

---
【分析対象セクション】: {section_type}
【歌詞（行番号付き）】:
{numbered_lyrics}"""

SONG_ANALYSIS_PROMPT = """あなたはプロの作詞アナリストです。
以下のルールに厳密に従い、楽曲全体を俯瞰的に分析してください。

## メタデータ推論ルール
- sentiment_score: 楽曲全体の感情極性を -1.0（絶望・悲哀）〜 1.0（歓喜・高揚）の小数で判定すること。
- timeline: 歌詞が主に描いている時間軸を "past" | "present" | "future" | "mixed" から1つ選ぶこと。
- abstract_balance_score: 歌詞の抽象/具体バランスを 1（抽象的）〜 4（具象的）の整数で判定すること。
  - 1: ほぼ抽象的な概念・感情のみ
  - 2: 抽象寄りだが一部に具体的な描写
  - 3: 具体的な情景が多いが抽象も混在
  - 4: ほぼ具象的な描写のみ
- colloquial_level: 歌詞の言葉遣いの口語度を判定すること。
  - "colloquial": 話し言葉に近い（「じゃん」「だよね」等を多用）
  - "intermediate": 話し言葉と書き言葉の中間
  - "poetic": 文語・詩的表現が主体

## 文末表現の分類ルール (ending_classifications)
- 以下の「Python解析で抽出された文末表現リスト」の各項目を、下記カテゴリのいずれかに分類すること。
- カテゴリ: 「断定」「否定」「疑問」「願望」「体言止め」「未完了」「余韻」
- リスト内の全項目に対して必ず分類結果を返すこと（スキップ禁止）。

【Python解析で抽出された文末表現リスト】:
{sentence_endings_json}

## 作詞ルールの抽出ルール (extracted_rules)
- この楽曲から「他の作詞でも真似できる具体的なテクニック」をルールとして抽出すること。
- 各ルールには根拠となるフレーズ（examples）を必ず1つ以上添えること。
- 以下の「既存ルール一覧」を参照し、意味的に同じルールが既にある場合は is_novel=false、完全に新しいルールの場合は is_novel=true とすること。
- 既存ルール一覧が空の場合は、全てのルールを is_novel=true とすること。

【既存ルール一覧】:
{existing_rules_json}

---
【楽曲タイトル】: {title}
【アーティスト】: {artist}
【全歌詞】:
{full_lyrics}"""


# ============================================
# メインクラス
# ============================================

class LLMAnalyzer:
    """Gemini 2.5 Flash を使ったLLM推論・解釈クラス"""

    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            print("WARNING: GEMINI_API_KEY is not set. LLM analysis will return mock data.")
            self.client = None
        else:
            self.client = genai.Client(api_key=api_key)

    @property
    def is_available(self) -> bool:
        """Gemini APIが利用可能かどうか"""
        return self.client is not None

    # ===================================================
    # APIコール①: セクション分析（散文翻訳 + レトリック抽出）
    # ===================================================

    def analyze_section_with_llm(
        self,
        section_type: str,
        lyrics_raw: str,
    ) -> SectionLLMResponse:
        """
        セクション単位のLLM分析を行う。

        Args:
            section_type: セクション名 (例: '1A', 'Chorus')
            lyrics_raw: セクションの歌詞テキスト（改行区切り）

        Returns:
            SectionLLMResponse: 散文翻訳とレトリック抽出の結果
        """
        if self.client is None:
            return self._mock_section_response(lyrics_raw)

        # 行番号付きの歌詞を組み立て
        lines = [line for line in lyrics_raw.split("\n") if line.strip()]
        numbered_lyrics = "\n".join(
            f"{i + 1}: {line}" for i, line in enumerate(lines)
        )

        prompt = SECTION_ANALYSIS_PROMPT.format(
            section_type=section_type,
            numbered_lyrics=numbered_lyrics,
        )

        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": SectionLLMResponse,
                },
            )
            return SectionLLMResponse.model_validate_json(response.text)
        except Exception as e:
            print(f"LLMセクション分析でエラーが発生しました: {e}")
            traceback.print_exc()
            return self._mock_section_response(lyrics_raw)

    # ===================================================
    # APIコール②: 楽曲全体分析（メタデータ + 文末分類 + ルール抽出）
    # ===================================================

    def analyze_song_with_llm(
        self,
        title: str,
        artist: str,
        full_lyrics: str,
        sentence_endings: list[dict],
        existing_rules: list[dict],
    ) -> SongLLMResponse:
        """
        楽曲全体のLLM分析を行う。

        Args:
            title: 楽曲タイトル
            artist: アーティスト名
            full_lyrics: 全歌詞テキスト
            sentence_endings: Phase 2で抽出された文末表現のリスト
                [{"ending_text": "のに", "source_line": "..."}, ...]
            existing_rules: DBに保存済みの作詞ルール一覧
                [{"rule_name": "..."}, ...]

        Returns:
            SongLLMResponse: メタデータ・文末分類・ルール抽出の結果
        """
        if self.client is None:
            return self._mock_song_response(sentence_endings)

        # 文末表現リストをJSON文字列化
        endings_for_prompt = [
            {"ending_text": e["ending_text"]}
            for e in sentence_endings
        ]
        sentence_endings_json = json.dumps(
            endings_for_prompt, ensure_ascii=False, indent=2
        )

        # 既存ルール一覧をJSON文字列化
        rules_for_prompt = [
            {"rule_name": r["rule_name"]}
            for r in existing_rules
        ]
        existing_rules_json = json.dumps(
            rules_for_prompt, ensure_ascii=False, indent=2
        ) if rules_for_prompt else "（まだ登録されたルールはありません）"

        prompt = SONG_ANALYSIS_PROMPT.format(
            title=title,
            artist=artist,
            full_lyrics=full_lyrics,
            sentence_endings_json=sentence_endings_json,
            existing_rules_json=existing_rules_json,
        )

        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": SongLLMResponse,
                },
            )
            return SongLLMResponse.model_validate_json(response.text)
        except Exception as e:
            print(f"LLM楽曲全体分析でエラーが発生しました: {e}")
            traceback.print_exc()
            return self._mock_song_response(sentence_endings)

    # ===================================================
    # モックレスポンス（APIキー未設定時のフォールバック）
    # ===================================================

    def _mock_section_response(self, lyrics_raw: str) -> SectionLLMResponse:
        """セクション分析のモックデータ"""
        lines = [line for line in lyrics_raw.split("\n") if line.strip()]
        mock_prose_lines = [
            ProseLineResult(
                line_number=i + 1,
                original_text=line.strip(),
                prose_text=f"（{line.strip()} の散文翻訳）",
            )
            for i, line in enumerate(lines)
        ]
        return SectionLLMResponse(
            sentiment_score=0.0,
            timeline="present",
            abstract_balance_score=3,
            colloquial_level="intermediate",
            prose_lines=mock_prose_lines,
            rhetoric=[],
        )

    def _mock_song_response(
        self, sentence_endings: list[dict]
    ) -> SongLLMResponse:
        """楽曲全体分析のモックデータ"""
        mock_endings = [
            EndingClassification(
                ending_text=e.get("ending_text", ""),
                category="未分類",
            )
            for e in sentence_endings
        ]
        return SongLLMResponse(
            sentiment_score=0.0,
            timeline="present",
            abstract_balance_score=3,
            colloquial_level="intermediate",
            ending_classifications=mock_endings,
            extracted_rules=[],
        )

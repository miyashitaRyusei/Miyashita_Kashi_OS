from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from google import genai
from analyzer.rule_based import RuleBasedAnalyzer
import json
import db
import os
import traceback
import time
from dotenv import load_dotenv

# 環境変数の読み込み
load_dotenv()

# --- 1. データモデル定義 ---
class SectionInput(BaseModel):
    section_name: str
    lyrics_raw: str

class AnalyzeRequest(BaseModel):
    song_id: str
    title: str
    artist: str
    sections: List[SectionInput]

# --- 2. LLM側分析モジュール (文脈・レトリック) ---
class LLMAnalyzer:
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            print("WARNING: GEMINI_API_KEY is not set. LLM analysis will return mock data.")
            self.client = None
        else:
            self.client = genai.Client(api_key=api_key)

    def analyze_section(self, section_name: str, lyrics: str) -> dict:
        # APIキーが無い場合はモックデータを返す
        if self.client is None:
            return self._mock_response(section_name, lyrics)

        prompt = f"""あなたはプロの作詞アナリストです。提供された歌詞セクションを分析し、JSON形式で結果を返してください。
挨拶や説明は一切不要です。JSONのみを出力してください。

【分析対象セクション】: {section_name}
【歌詞】:
{lyrics}

【分析指示】
1. 歌詞を「主語や目的語を補い、倒置や比喩をなくした、文法的に正しい論理的な散文（一文）」に翻訳し、`prose_translation` に出力してください。
2. 翻訳した散文と元の歌詞を比較し、どこを省略したか、どこを倒置したか、どんな意味的摩擦を起こしているか等の「差分」を抽出し、`extracted_rhetoric` に出力してください。

【出力JSONスキーマ】
{{
  "prose_translation": "(翻訳した論理的な散文)",
  "sentiment_score": (感情極性 -1.0〜1.0の数値),
  "timeline": ("past" | "present" | "future" | "mixed"),
  "extracted_rhetoric": [
    {{
      "type": "(修辞技法の種類。例: 意味的摩擦, 倒置法, 省略, 比喩, 反復 等)",
      "phrase": "(該当フレーズ)",
      "reason": "(元の散文と比較してなぜそう判定したかの簡潔な理由)"
    }}
  ],
  "phrase_start": "(セクションの特徴的な文頭フレーズ)",
  "phrase_end": "(セクションの特徴的な文末フレーズ)",
  "concreteness_score": (具象度。1:抽象的, 2:やや抽象的, 3:やや具象的, 4:具象的)
}}"""

        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                }
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"LLM分析でエラーが発生しました: {e}")
            traceback.print_exc()
            return self._mock_response(section_name, lyrics)

    def _mock_response(self, section_name: str, lyrics: str) -> dict:
        """LLMが使えない場合のモックデータ"""
        return {
            "prose_translation": "（ここに論理的な散文への翻訳結果が表示されます）",
            "sentiment_score": 0.0,
            "timeline": "present",
            "extracted_rhetoric": [],
            "phrase_start": "",
            "phrase_end": "",
            "concreteness_score": 3
        }

# --- 3. APIエンドポイント ---
app = FastAPI()

# CORSの設定
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# アナライザーの初期化
rule_analyzer = RuleBasedAnalyzer()
llm_analyzer = LLMAnalyzer()

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "llm_available": llm_analyzer.client is not None}

@app.post("/api/analyze")
async def analyze_lyrics(req: AnalyzeRequest):
    try:
        all_lyrics = "\n".join([sec.lyrics_raw for sec in req.sections])

        # マクロ分析 (Python / RuleBasedAnalyzer)
        macro = rule_analyzer.analyze_macro(all_lyrics)

        # セクション別分析 (Python & LLM)
        section_results = []
        concreteness_scores = []
        information_densities = []

        for sec in req.sections:
            # Python側: 確実な計量処理（形態素解析・モーラ・母音・情報密度）
            py_res = rule_analyzer.analyze_section(sec.lyrics_raw)
            # LLM側: 文脈・レトリック・散文抽出
            llm_res = llm_analyzer.analyze_section(sec.section_name, sec.lyrics_raw)
            time.sleep(2)  # APIレートリミット回避のための待機

            concreteness_scores.append(llm_res.get("concreteness_score", 3))
            information_densities.append(py_res.get("information_density", 0.0))

            # 結果のマージ
            merged_section = {
                "section_name": sec.section_name,
                "lyrics_raw": sec.lyrics_raw,
                # Python側の解析結果
                "mora_counts": py_res["mora_counts"],
                "vowels": py_res["vowels"],
                "end_vowels": py_res["end_vowels"],
                "information_density": py_res.get("information_density", 0.0),
                # LLM側の解析結果
                "prose_translation": llm_res.get("prose_translation", ""),
                "sentiment_score": llm_res.get("sentiment_score", 0),
                "timeline": llm_res.get("timeline", "present"),
                "extracted_rhetoric": llm_res.get("extracted_rhetoric", []),
                "phrase_start": llm_res.get("phrase_start", ""),
                "phrase_end": llm_res.get("phrase_end", ""),
            }
            section_results.append(merged_section)

        # 総合スコアの算出
        avg_concreteness = sum(concreteness_scores) / len(concreteness_scores) if concreteness_scores else 3.0
        avg_info_density = sum(information_densities) / len(information_densities) if information_densities else 0.0

        final_response = {
            "song_id": req.song_id,
            "title": req.title,
            "artist": req.artist,
            "evaluation_tag": "like",
            "macro_metrics": {
                # Python側の品詞分析結果
                "noun_ratio": macro["noun_ratio"],
                "verb_ratio": macro["verb_ratio"],
                "adjective_ratio": macro["adjective_ratio"],
                "pos_ratios": macro["pos_ratios"],
                "first_person_count": macro["first_person_count"],
                "second_person_count": macro["second_person_count"],
                "total_tokens": macro["total_tokens"],
                "information_density": round(avg_info_density, 4),
                # LLM側の平均
                "concreteness_score": round(avg_concreteness, 1),
            },
            "sections": section_results,
        }

        # Supabaseに保存（接続されている場合）
        try:
            db.save_song(final_response)
            db.save_phrase_stocks(req.song_id, section_results)
        except Exception as db_err:
            print(f"DB保存をスキップしました（Supabase未接続の可能性）: {db_err}")

        return final_response
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# --- Supabase連携 APIエンドポイント ---

@app.get("/api/songs")
async def get_songs():
    """全楽曲の一覧を取得する"""
    try:
        songs = db.get_all_songs()
        return {"songs": songs}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/songs/{song_id}")
async def get_song(song_id: str):
    """特定の楽曲を取得する"""
    try:
        song = db.get_song_by_id(song_id)
        if not song:
            raise HTTPException(status_code=404, detail="Song not found")
        return song
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/songs/{song_id}")
async def delete_song(song_id: str):
    """楽曲を削除する"""
    try:
        success = db.delete_song(song_id)
        return {"success": success}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


class EvaluationTagUpdate(BaseModel):
    evaluation_tag: str  # "like" | "dislike" | "neutral"

@app.patch("/api/songs/{song_id}/tag")
async def update_song_tag(song_id: str, body: EvaluationTagUpdate):
    """楽曲の評価タグを更新する"""
    try:
        result = db.update_evaluation_tag(song_id, body.evaluation_tag)
        return {"success": result is not None}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats")
async def get_stats(evaluation_tag: Optional[str] = None):
    """全曲の平均値を集計して返す（フィルタ可能）"""
    try:
        stats = db.get_aggregated_metrics(evaluation_tag)
        return stats
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/phrase-stocks")
async def get_phrase_stocks(stock_type: Optional[str] = None):
    """フレーズストックを取得する（種別フィルタ可能）"""
    try:
        if stock_type:
            stocks = db.get_phrase_stocks_by_type(stock_type)
        else:
            stocks = db.get_all_phrase_stocks()
        return {"stocks": stocks}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

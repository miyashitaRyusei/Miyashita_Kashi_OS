from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import json
import db
import traceback
import time
from dotenv import load_dotenv

from analyzer.rule_based import RuleBasedAnalyzer
from analyzer.llm_analyzer import LLMAnalyzer

# 環境変数の読み込み
load_dotenv()

# --- 1. データモデル定義 ---
class SectionInput(BaseModel):
    section_name: str
    lyrics_raw: str

class AnalyzeRequest(BaseModel):
    title: str
    artist: str
    sections: List[SectionInput]

class ProseUpdate(BaseModel):
    prose_text: str

class RhetoricUpdate(BaseModel):
    reason: str
    type: Optional[str] = None
    phrase: Optional[str] = None

# --- 2. APIエンドポイント ---
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
    return {"status": "ok", "llm_available": llm_analyzer.is_available}


# ============================================
# 非同期バックグラウンド処理タスク
# ============================================

def process_analysis_task(song_id: str, title: str, artist: str, sections: List[SectionInput]):
    """バックグラウンドで実行されるLLM推論とDB保存のメインロジック"""
    try:
        all_lyrics = "\n".join([sec.lyrics_raw for sec in sections])

        # マクロ分析 (Python / RuleBasedAnalyzer)
        macro = rule_analyzer.analyze_macro(all_lyrics)

        section_results = []
        concreteness_scores = []
        information_densities = []

        # 1. セクション別分析 (Python & LLM API①)
        for sec in sections:
            # Python側: 確実な計量処理
            py_res = rule_analyzer.analyze_section(sec.lyrics_raw)
            
            # LLM側: 散文翻訳とレトリック抽出
            llm_res = llm_analyzer.analyze_section_with_llm(sec.section_name, sec.lyrics_raw)
            time.sleep(1.5)  # APIレートリミット回避

            # prose_linesを辞書（dict）のリストに変換
            prose_lines_dict = [p.model_dump() for p in llm_res.prose_lines]
            rhetoric_dict = [r.model_dump() for r in llm_res.rhetoric]

            merged_section = {
                "section_name": sec.section_name,
                "lyrics_raw": sec.lyrics_raw,
                "mora_counts": py_res["mora_counts"],
                "vowels": py_res["vowels"],
                "end_vowels": py_res["end_vowels"],
                "information_density": py_res.get("information_density", 0.0),
                "prose_lines": prose_lines_dict,
                "extracted_rhetoric": rhetoric_dict,
            }
            section_results.append(merged_section)
            information_densities.append(py_res.get("information_density", 0.0))

        # 2. 楽曲全体分析 (LLM API②)
        # 文末表現と既存ルールは本来DBから取得して渡す（今回は空配列でモック的に）
        song_llm_res = llm_analyzer.analyze_song_with_llm(
            title=title,
            artist=artist,
            full_lyrics=all_lyrics,
            sentence_endings=[], 
            existing_rules=[]
        )

        avg_info_density = sum(information_densities) / len(information_densities) if information_densities else 0.0

        final_response = {
            "song_id": song_id,
            "title": title,
            "artist": artist,
            "macro_metrics": {
                "noun_ratio": macro["noun_ratio"],
                "verb_ratio": macro["verb_ratio"],
                "adjective_ratio": macro["adjective_ratio"],
                "pos_ratios": macro["pos_ratios"],
                "first_person_count": macro["first_person_count"],
                "second_person_count": macro["second_person_count"],
                "total_tokens": macro["total_tokens"],
                "information_density": round(avg_info_density, 4),
                "concreteness_score": song_llm_res.abstract_balance_score,
                "sentiment_score": song_llm_res.sentiment_score,
            },
            "colloquial_level": song_llm_res.colloquial_level,
            "sections": section_results,
        }

        # DBにリレーショナル形式で保存（完了ステータスへ更新）
        db.save_song_analysis(song_id, final_response)
        
    except Exception as e:
        print(f"解析タスクでエラー発生: {e}")
        traceback.print_exc()
        db.update_song_status(song_id, "error")


@app.post("/api/analyze")
async def analyze_lyrics(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    """
    解析リクエストを受け取り、ジョブID(song_id)を即座に返す非同期エンドポイント。
    """
    try:
        # まずプレースホルダーをDBに作成し、処理中ステータスとする
        song = db.create_song_placeholder(req.title, req.artist)
        song_id = song["id"]
        
        # バックグラウンドタスクを登録
        background_tasks.add_task(process_analysis_task, song_id, req.title, req.artist, req.sections)
        
        return {"id": song_id, "status": "processing"}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/songs/{song_id}/status")
async def get_song_status(song_id: str):
    """解析ジョブのステータスをポーリングするためのエンドポイント"""
    try:
        # get_song_by_id の代わりに status だけを取得する軽量クエリを db.py に実装していないため
        # 既存の全楽曲から取るか、直接Supabase叩く (db.py経由で)
        sb = db.get_supabase()
        res = sb.table("songs").select("id, analysis_status").eq("id", song_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Song not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# 基本のCRUD API
# ============================================

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
    """特定の楽曲をネストされた詳細と共に取得する"""
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


class SongLikeUpdate(BaseModel):
    is_liked: bool

@app.patch("/api/songs/{song_id}/like")
async def update_song_like(song_id: str, body: SongLikeUpdate):
    """楽曲のLikeタグを更新する"""
    try:
        result = db.update_evaluation_tag(song_id, body.is_liked)
        return {"success": result is not None}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# インライン編集 API
# ============================================

@app.patch("/api/lines/{line_id}")
async def update_line(line_id: str, body: ProseUpdate):
    """特定の行の散文翻訳を更新する"""
    try:
        result = db.update_line_prose(line_id, body.prose_text)
        return {"success": result is not None, "data": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/rhetoric/{rhetoric_id}")
async def update_rhetoric(rhetoric_id: str, body: RhetoricUpdate):
    """抽出レトリックの理由・種類等を更新する"""
    try:
        result = db.update_rhetoric(rhetoric_id, body.reason, body.type, body.phrase)
        return {"success": result is not None, "data": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# その他の取得 API
# ============================================

@app.get("/api/sentence-endings")
async def get_sentence_endings_api():
    try:
        return {"endings": db.get_sentence_endings()}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/lyric-rules")
async def get_lyric_rules_api():
    try:
        return {"rules": db.get_lyric_rules()}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

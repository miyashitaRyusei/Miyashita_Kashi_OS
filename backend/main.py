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

        # Python側の分析（全セクション一括）
        sections_for_py = [{"section_name": s.section_name, "lyrics_raw": s.lyrics_raw} for s in sections]
        py_song_res = rule_analyzer.analyze_song(sections_for_py)

        section_results = []
        all_sentence_endings = []
        all_phrases = []

        # 1. セクション別分析 (Python & LLM API①)
        for sec_input, py_sec_res in zip(sections, py_song_res.sections):
            # LLM側: 散文翻訳とレトリック抽出
            llm_res = llm_analyzer.analyze_section_with_llm(sec_input.section_name, sec_input.lyrics_raw)
            time.sleep(1.5)  # APIレートリミット回避

            # prose_linesを辞書（dict）のリストに変換
            prose_lines_dict = [p.model_dump() for p in llm_res.prose_lines]
            rhetoric_dict = [r.model_dump() for r in llm_res.rhetoric]

            mora_counts = [line.mora_count for line in py_sec_res.lines]
            end_vowels = [line.end_vowel for line in py_sec_res.lines]

            for ending in py_sec_res.sentence_endings:
                all_sentence_endings.append({"ending_text": ending.ending_text})

            for phrase in getattr(py_sec_res, "phrases", []):
                all_phrases.append({
                    "phrase_type": phrase.phrase_type,
                    "text": phrase.text,
                    "source_line": phrase.source_line
                })

            merged_section = {
                "section_name": py_sec_res.section_type,
                "lyrics_raw": sec_input.lyrics_raw,
                "mora_counts": mora_counts,
                "end_vowels": end_vowels,
                "information_density": py_sec_res.content_word_density,
                "noun_density": py_sec_res.noun_density,
                "verb_density": py_sec_res.verb_density,
                "adj_density": py_sec_res.adj_density,
                "adv_density": py_sec_res.adv_density,
                "content_word_density": py_sec_res.content_word_density,
                "prose_lines": prose_lines_dict,
                "extracted_rhetoric": rhetoric_dict,
                "sentiment_score": llm_res.sentiment_score,
                "timeline": llm_res.timeline,
                "abstract_balance_score": llm_res.abstract_balance_score,
                "colloquial_level": llm_res.colloquial_level,
            }
            section_results.append(merged_section)

        # 2. 楽曲全体分析 (LLM API②)
        # 文末表現と既存ルールは本来DBから取得して渡す（今回は空配列でモック的に）
        song_llm_res = llm_analyzer.analyze_song_with_llm(
            title=title,
            artist=artist,
            full_lyrics=all_lyrics,
            sentence_endings=all_sentence_endings,
            phrases=all_phrases
        )

        # フレーズの抽出元行をマッピング
        phrase_source_map = {(p["phrase_type"], p["text"]): p["source_line"] for p in all_phrases}
        
        phrase_classifications_dict = []
        for p in song_llm_res.phrase_classifications:
            p_dict = p.model_dump()
            source = phrase_source_map.get((p.phrase_type, p.text))
            p_dict["examples"] = [source] if source else []
            phrase_classifications_dict.append(p_dict)

        # セクションの平均値を全体のスコアとして算出
        if section_results:
            avg_concreteness = sum(s["abstract_balance_score"] for s in section_results) / len(section_results)
            avg_sentiment = sum(s["sentiment_score"] for s in section_results) / len(section_results)
        else:
            avg_concreteness = song_llm_res.abstract_balance_score
            avg_sentiment = song_llm_res.sentiment_score

        # 4. 全体の統合とDB保存
        final_response = {
            "song_id": song_id,
            "title": title,
            "artist": artist,
            "macro_metrics": {
                "information_density": py_song_res.information_density,
                "concreteness_score": round(avg_concreteness, 2),
                "sentiment_score": round(avg_sentiment, 3),
            },
            "colloquial_level": song_llm_res.colloquial_level,
            "timeline": song_llm_res.timeline,
            "perspective_score": song_llm_res.perspective_score,
            "narrative_score": song_llm_res.narrative_score,
            "cynicism_score": song_llm_res.cynicism_score,
            "sections": section_results,
            "ending_classifications": [e.model_dump() for e in song_llm_res.ending_classifications],
            "phrase_classifications": phrase_classifications_dict,
            "extracted_rules": [r.model_dump() for r in song_llm_res.extracted_rules],
        }

        # DB保存（ここでsongs, sections, lines, rhetoric, rules, endingsがINSERTされる）
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
# その他の取得・更新 API
# ============================================

class DictionaryPreferenceRequest(BaseModel):
    item_type: str
    item_key: str
    is_favorite: bool
    is_deleted: bool
    memo: Optional[str] = None

@app.post("/api/dictionary-preferences")
async def update_dictionary_preference(req: DictionaryPreferenceRequest):
    """辞書アイテムのお気に入り・削除状態を更新する"""
    try:
        db.set_dictionary_preference(req.item_type, req.item_key, req.is_favorite, req.is_deleted, req.memo)
        return {"success": True}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sentence-endings")
async def get_sentence_endings_api(is_liked: Optional[bool] = None):
    try:
        return {"endings": db.get_sentence_endings(is_liked)}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/lyric-rules")
async def get_lyric_rules_api(is_liked: Optional[bool] = None):
    try:
        return {"rules": db.get_lyric_rules(is_liked)}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/phrases")
async def get_phrases_api(is_liked: Optional[bool] = None):
    try:
        return {"phrases": db.get_lyric_phrases(is_liked)}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# Draft API
# ============================================

class DraftCreateRequest(BaseModel):
    title: str
    content: str

class DraftUpdateRequest(BaseModel):
    title: str
    content: str

@app.get("/api/drafts")
async def get_drafts_api():
    try:
        return {"drafts": db.get_drafts()}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/drafts/{draft_id}")
async def get_draft_api(draft_id: str):
    try:
        draft = db.get_draft(draft_id)
        if not draft:
            raise HTTPException(status_code=404, detail="Draft not found")
        return draft
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/drafts")
async def create_draft_api(req: DraftCreateRequest):
    try:
        return db.create_draft(req.title, req.content)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/drafts/{draft_id}")
async def update_draft_api(draft_id: str, req: DraftUpdateRequest):
    try:
        return db.update_draft(draft_id, req.title, req.content)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/drafts/{draft_id}")
async def delete_draft_api(draft_id: str):
    try:
        db.delete_draft(draft_id)
        return {"success": True}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# Idea Seeds API (アイデアの種)
# ============================================

class IdeaCreateRequest(BaseModel):
    content: str
    category: Optional[str] = "単語"
    memo: Optional[str] = None

class IdeaUpdateRequest(BaseModel):
    content: str
    category: str
    memo: Optional[str] = None

@app.get("/api/ideas")
async def get_ideas_api():
    try:
        return {"ideas": db.get_idea_seeds()}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ideas")
async def create_idea_api(req: IdeaCreateRequest):
    try:
        return db.create_idea_seed(req.content, req.category, req.memo)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/ideas/{idea_id}")
async def update_idea_api(idea_id: str, req: IdeaUpdateRequest):
    try:
        return db.update_idea_seed(idea_id, req.content, req.category, req.memo)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/ideas/{idea_id}")
async def delete_idea_api(idea_id: str):
    try:
        db.delete_idea_seed(idea_id)
        return {"success": True}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

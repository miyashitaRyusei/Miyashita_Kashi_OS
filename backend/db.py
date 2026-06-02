"""
db.py — Supabase連携モジュール

分析結果の保存・取得・削除、フレーズストックの蓄積を担当。
"""

import os
import json
from supabase import create_client, Client
from typing import Optional

_supabase: Optional[Client] = None


def get_supabase() -> Client:
    """Supabaseクライアントのシングルトンを返す"""
    global _supabase
    if _supabase is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL と SUPABASE_KEY の環境変数が設定されていません。"
            )
        _supabase = create_client(url, key)
    return _supabase


# ============================================
# Songs (楽曲 + 分析結果)
# ============================================

def save_song(analysis_result: dict) -> dict:
    """
    分析結果をSupabaseのsongsテーブルに保存する。
    同じsong_idが既に存在する場合はupsert（上書き更新）。
    """
    sb = get_supabase()

    macro = analysis_result.get("macro_metrics", {})
    record = {
        "song_id": analysis_result["song_id"],
        "title": analysis_result["title"],
        "artist": analysis_result["artist"],
        "evaluation_tag": analysis_result.get("evaluation_tag", "like"),
        # Python解析結果
        "noun_ratio": macro.get("noun_ratio", 0),
        "verb_ratio": macro.get("verb_ratio", 0),
        "adjective_ratio": macro.get("adjective_ratio", 0),
        "pos_ratios": json.dumps(macro.get("pos_ratios", {})),
        "first_person_count": macro.get("first_person_count", 0),
        "second_person_count": macro.get("second_person_count", 0),
        "total_tokens": macro.get("total_tokens", 0),
        # LLM解析結果
        "concreteness_score": macro.get("concreteness_score", 3.0),
        # セクション詳細
        "sections": json.dumps(analysis_result.get("sections", []), ensure_ascii=False),
    }

    result = sb.table("songs").upsert(record, on_conflict="song_id").execute()
    return result.data[0] if result.data else record


def get_all_songs() -> list:
    """全楽曲を取得する"""
    sb = get_supabase()
    result = sb.table("songs").select("*").order("created_at", desc=True).execute()
    # sections と pos_ratios をJSONパースして返す
    songs = []
    for row in result.data:
        if isinstance(row.get("sections"), str):
            row["sections"] = json.loads(row["sections"])
        if isinstance(row.get("pos_ratios"), str):
            row["pos_ratios"] = json.loads(row["pos_ratios"])
        songs.append(row)
    return songs


def get_song_by_id(song_id: str) -> Optional[dict]:
    """特定の楽曲を取得する"""
    sb = get_supabase()
    result = sb.table("songs").select("*").eq("song_id", song_id).execute()
    if result.data:
        row = result.data[0]
        if isinstance(row.get("sections"), str):
            row["sections"] = json.loads(row["sections"])
        if isinstance(row.get("pos_ratios"), str):
            row["pos_ratios"] = json.loads(row["pos_ratios"])
        return row
    return None


def delete_song(song_id: str) -> bool:
    """楽曲を削除する"""
    sb = get_supabase()
    result = sb.table("songs").delete().eq("song_id", song_id).execute()
    return len(result.data) > 0


def update_evaluation_tag(song_id: str, tag: str) -> Optional[dict]:
    """楽曲の評価タグを更新する"""
    sb = get_supabase()
    result = sb.table("songs").update({"evaluation_tag": tag}).eq("song_id", song_id).execute()
    return result.data[0] if result.data else None


def get_aggregated_metrics(evaluation_tag: Optional[str] = None) -> dict:
    """
    全曲（またはフィルタ済み）の平均値を集計して返す。
    """
    sb = get_supabase()
    query = sb.table("songs").select("*")
    if evaluation_tag:
        query = query.eq("evaluation_tag", evaluation_tag)
    result = query.execute()

    songs = result.data
    if not songs:
        return {"count": 0}

    count = len(songs)
    avg = lambda key: round(sum(s.get(key, 0) or 0 for s in songs) / count, 4)

    return {
        "count": count,
        "avg_noun_ratio": avg("noun_ratio"),
        "avg_verb_ratio": avg("verb_ratio"),
        "avg_adjective_ratio": avg("adjective_ratio"),
        "avg_first_person_count": round(sum(s.get("first_person_count", 0) or 0 for s in songs) / count, 1),
        "avg_second_person_count": round(sum(s.get("second_person_count", 0) or 0 for s in songs) / count, 1),
        "avg_total_tokens": round(sum(s.get("total_tokens", 0) or 0 for s in songs) / count, 1),
        "avg_concreteness_score": round(sum(s.get("concreteness_score", 3.0) or 3.0 for s in songs) / count, 2),
    }


# ============================================
# Phrase Stock (ストック辞書)
# ============================================

def save_phrase_stocks(song_id: str, sections: list):
    """
    分析結果のセクションデータから、フレーズストックを抽出してSupabaseに保存する。
    """
    sb = get_supabase()
    records = []

    for sec in sections:
        section_name = sec.get("section_name", "")

        # 文頭フレーズ
        if sec.get("phrase_start"):
            records.append({
                "song_id": song_id,
                "section_name": section_name,
                "stock_type": "phrase_start",
                "phrase": sec["phrase_start"],
            })

        # 文末フレーズ
        if sec.get("phrase_end"):
            records.append({
                "song_id": song_id,
                "section_name": section_name,
                "stock_type": "phrase_end",
                "phrase": sec["phrase_end"],
            })

        # レトリック
        for rhet in sec.get("extracted_rhetoric", []):
            records.append({
                "song_id": song_id,
                "section_name": section_name,
                "stock_type": "rhetoric",
                "phrase": rhet.get("phrase", ""),
                "rhetoric_type": rhet.get("type", ""),
                "reason": rhet.get("reason", ""),
            })

    if records:
        # 既存のストックを削除してから挿入（upsertの代わり）
        sb.table("phrase_stock").delete().eq("song_id", song_id).execute()
        sb.table("phrase_stock").insert(records).execute()


def get_all_phrase_stocks() -> list:
    """全フレーズストックを取得する"""
    sb = get_supabase()
    result = sb.table("phrase_stock").select("*").order("created_at", desc=True).execute()
    return result.data


def get_phrase_stocks_by_type(stock_type: str) -> list:
    """種別でフレーズストックをフィルタ取得する"""
    sb = get_supabase()
    result = sb.table("phrase_stock").select("*").eq("stock_type", stock_type).order("created_at", desc=True).execute()
    return result.data

"""
db.py — Supabase連携モジュール (Phase 5 リレーショナル版)

分析結果の保存・取得・削除、フレーズストックの蓄積を担当。
Phase 1のSQLスキーマに完全適合するように修正済み。
"""

import os
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

def create_song_placeholder(title: str, artist: str) -> dict:
    """
    非同期解析開始時にプレースホルダーとなる楽曲レコードを作成し、IDを返す。
    """
    sb = get_supabase()
    record = {
        "title": title,
        "artist": artist,
        "analysis_status": "processing",
    }
    result = sb.table("songs").insert(record).execute()
    return result.data[0]


def update_song_status(song_id: str, status: str) -> Optional[dict]:
    """楽曲の解析ステータスのみを更新する（エラー時などに使用）"""
    sb = get_supabase()
    result = sb.table("songs").update({"analysis_status": status}).eq("id", song_id).execute()
    return result.data[0] if result.data else None


def save_song_analysis(song_id: str, analysis_result: dict) -> dict:
    """
    LLM解析が完了したデータをリレーショナルに保存する。
    songs を UPDATE し、sections, lines, rhetoric を INSERT する。
    """
    sb = get_supabase()
    macro = analysis_result.get("macro_metrics", {})

    # 1. songs テーブルのUPDATE
    song_record = {
        "sentiment_score": analysis_result.get("macro_metrics", {}).get("sentiment_score", None),
        "abstract_balance_score": macro.get("concreteness_score", 3.0),
        "information_density": macro.get("information_density", 0.0),
        "colloquial_level": analysis_result.get("colloquial_level", None),
        "timeline": analysis_result.get("timeline", None),
    }

    sb.table("songs").update(song_record).eq("id", song_id).execute()

    # 重複を防ぐため、既存のセクションがあれば削除 (ON DELETE CASCADEにより子も消える)
    sb.table("sections").delete().eq("song_id", song_id).execute()

    # 2. sections, lines, rhetoric のINSERT
    sections_data = analysis_result.get("sections", [])
    
    for idx, sec in enumerate(sections_data):
        section_record = {
            "song_id": song_id,
            "section_type": sec.get("section_name", f"Section {idx+1}"),
            "total_mora": sum(sec.get("mora_counts", [])),
            "sentiment_score": sec.get("sentiment_score", 0.0),
            "timeline": sec.get("timeline"),
            "abstract_balance_score": sec.get("abstract_balance_score"),
            "colloquial_level": sec.get("colloquial_level"),
            "noun_density": sec.get("noun_density", 0.0),
            "verb_density": sec.get("verb_density", 0.0),
            "adj_density": sec.get("adj_density", 0.0),
            "adv_density": sec.get("adv_density", 0.0),
            "content_word_density": sec.get("content_word_density", 0.0),
            "order_index": idx,
        }
        sec_res = sb.table("sections").insert(section_record).execute()
        section_id = sec_res.data[0]["id"]

        # Lines INSERT
        lines_records = []
        raw_lines = sec.get("lyrics_raw", "").split("\n")
        raw_lines = [l for l in raw_lines if l.strip()]
        
        mora_counts = sec.get("mora_counts", [])
        end_vowels = sec.get("end_vowels", [])
        # LLMから得た散文翻訳
        prose_lines = sec.get("prose_lines", []) # Phase 3でLLMが返すリスト
        prose_map = {p["line_number"]: p["prose_text"] for p in prose_lines} if prose_lines else {}

        for line_idx, text in enumerate(raw_lines):
            num = line_idx + 1
            lines_records.append({
                "section_id": section_id,
                "line_number": num,
                "text": text,
                "mora_count": mora_counts[line_idx] if line_idx < len(mora_counts) else 0,
                "end_vowel": end_vowels[line_idx] if line_idx < len(end_vowels) else None,
                "prose_text": prose_map.get(num, None),
            })
        
        if lines_records:
            sb.table("lines").insert(lines_records).execute()

        # Rhetoric INSERT
        rhetoric_records = []
        for rhet in sec.get("extracted_rhetoric", []):
            rhetoric_records.append({
                "section_id": section_id,
                "type": rhet.get("type", "その他"),
                "phrase": rhet.get("phrase", ""),
                "reason": rhet.get("reason", ""),
            })
        
        if rhetoric_records:
            sb.table("rhetoric").insert(rhetoric_records).execute()

    # 3. ルールと文末表現の保存
    # 辞書データ (Sentence Endings)
    endings_data = analysis_result.get("ending_classifications", [])
    endings_records = []
    for ending in endings_data:
        text = ending.get("ending_text")
        category = ending.get("category")
        if not text:
            continue
        endings_records.append({
            "song_id": song_id,
            "ending_text": text,
            "category": category,
            "appearance_count": 1,
            "examples": []
        })
    if endings_records:
        sb.table("sentence_endings").insert(endings_records).execute()

    # 作詞ルールブック (Lyric Rules)
    rules_data = analysis_result.get("extracted_rules", [])
    rules_records = []
    for rule in rules_data:
        rules_records.append({
            "song_id": song_id,
            "rule_name": rule.get("rule_name", ""),
            "description": rule.get("description", ""),
            "tag": rule.get("tag", "その他"),
            "examples": rule.get("examples", [])
        })
    if rules_records:
        sb.table("lyric_rules").insert(rules_records).execute()
        
    # フレーズ辞典 (Lyric Phrases)
    phrase_classifications = analysis_result.get("phrase_classifications", [])
    phrase_records = []
    for pc in phrase_classifications:
        phrase_records.append({
            "song_id": song_id,
            "phrase_type": pc.get("phrase_type", "start"),
            "text": pc.get("text", ""),
            "category": pc.get("category", "その他"),
            "appearance_count": 1,
            "examples": []
        })
    if phrase_records:
        sb.table("lyric_phrases").insert(phrase_records).execute()

    # 4. 最後にステータスをcompletedにして、フロントエンドへのポーリング完了を通知
    sb.table("songs").update({"analysis_status": "completed"}).eq("id", song_id).execute()

    return sb.table("songs").select("*").eq("id", song_id).execute().data[0]


def get_all_songs() -> list:
    """全楽曲を取得する (songsテーブルのみ)"""
    sb = get_supabase()
    result = sb.table("songs").select("*").order("created_at", desc=True).execute()
    return result.data


def get_song_by_id(song_id: str) -> Optional[dict]:
    """特定の楽曲をネストされた詳細データと共に取得する"""
    sb = get_supabase()
    
    # 1. 楽曲取得
    song_res = sb.table("songs").select("*").eq("id", song_id).execute()
    if not song_res.data:
        return None
    song = song_res.data[0]
    
    # 2. セクション取得
    sections_res = sb.table("sections").select("*").eq("song_id", song_id).order("order_index").execute()
    sections = sections_res.data
    
    for sec in sections:
        sec_id = sec["id"]
        # 行取得
        lines_res = sb.table("lines").select("*").eq("section_id", sec_id).order("line_number").execute()
        sec["lines"] = lines_res.data
        
        # レトリック取得
        rhet_res = sb.table("rhetoric").select("*").eq("section_id", sec_id).execute()
        sec["rhetoric"] = rhet_res.data

    song["sections"] = sections
    return song


def delete_song(song_id: str) -> bool:
    """楽曲を削除する"""
    sb = get_supabase()
    result = sb.table("songs").delete().eq("id", song_id).execute()
    return len(result.data) > 0


def update_evaluation_tag(song_id: str, is_liked: bool) -> Optional[dict]:
    """楽曲のLike状態を更新する"""
    sb = get_supabase()
    result = sb.table("songs").update({"is_liked": is_liked}).eq("id", song_id).execute()
    return result.data[0] if result.data else None


# ============================================
# Inline Editing APIs
# ============================================

def update_line_prose(line_id: str, prose_text: str) -> Optional[dict]:
    """特定の行の散文翻訳を更新する"""
    sb = get_supabase()
    result = sb.table("lines").update({"prose_text": prose_text}).eq("id", line_id).execute()
    return result.data[0] if result.data else None


def update_rhetoric(rhetoric_id: str, reason: str, type_str: str = None, phrase: str = None) -> Optional[dict]:
    """レトリックの内容や理由を更新する"""
    sb = get_supabase()
    update_data = {"reason": reason}
    if type_str: update_data["type"] = type_str
    if phrase: update_data["phrase"] = phrase
        
    result = sb.table("rhetoric").update(update_data).eq("id", rhetoric_id).execute()
    return result.data[0] if result.data else None


# ============================================
# Dictionary (文末表現・ルール)
# ============================================
# 本来は分析完了時等に抽出されたデータをこれらに保存する。

def get_sentence_endings() -> list:
    sb = get_supabase()
    raw_data = sb.table("sentence_endings").select("*").execute().data
    
    # 楽曲ごとに保存された同一の文末表現を Python 側で集計する
    aggregated = {}
    for row in raw_data:
        text = row["ending_text"]
        if text not in aggregated:
            aggregated[text] = {
                "id": row["id"],
                "ending_text": text,
                "category": row.get("category"),
                "appearance_count": 0,
                "examples": []
            }
        aggregated[text]["appearance_count"] += row.get("appearance_count", 1)
        if row.get("examples"):
            aggregated[text]["examples"].extend(row["examples"])
            
    # 出現回数で降順ソート
    sorted_endings = sorted(aggregated.values(), key=lambda x: x["appearance_count"], reverse=True)
    return sorted_endings


def get_lyric_rules() -> list:
    sb = get_supabase()
    return sb.table("lyric_rules").select("*").order("created_at", desc=True).execute().data


def get_lyric_phrases() -> list:
    """全楽曲のフレーズを集計して返す"""
    sb = get_supabase()
    data = sb.table("lyric_phrases").select("*").execute().data
    
    aggregated = {}
    for row in data:
        text = row.get("text")
        p_type = row.get("phrase_type")
        if not text or not p_type:
            continue
        
        key = f"{p_type}_{text}"
        if key not in aggregated:
            aggregated[key] = {
                "id": row["id"],
                "phrase_type": p_type,
                "text": text,
                "category": row.get("category"),
                "appearance_count": 0,
                "examples": []
            }
        aggregated[key]["appearance_count"] += row.get("appearance_count", 1)
        if row.get("examples"):
            aggregated[key]["examples"].extend(row["examples"])
            
    sorted_phrases = sorted(aggregated.values(), key=lambda x: x["appearance_count"], reverse=True)
    return sorted_phrases

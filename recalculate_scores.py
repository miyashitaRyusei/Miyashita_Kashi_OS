import os
from supabase import create_client

def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        print("SUPABASE_URL or SUPABASE_KEY is missing.")
        return

    sb = create_client(url, key)

    # 1. すべての曲を取得
    songs_res = sb.table("songs").select("id").execute()
    songs = songs_res.data

    print(f"Found {len(songs)} songs.")

    for song in songs:
        song_id = song["id"]
        # 2. セクションを取得
        sec_res = sb.table("sections").select("abstract_balance_score, sentiment_score").eq("song_id", song_id).execute()
        sections = sec_res.data
        
        if not sections:
            continue

        # 3. 平均を計算
        valid_abs = [s["abstract_balance_score"] for s in sections if s["abstract_balance_score"] is not None]
        valid_sen = [s["sentiment_score"] for s in sections if s["sentiment_score"] is not None]

        updates = {}
        if valid_abs:
            updates["abstract_balance_score"] = round(sum(valid_abs) / len(valid_abs), 2)
        if valid_sen:
            updates["sentiment_score"] = round(sum(valid_sen) / len(valid_sen), 3)

        if updates:
            # 4. 更新
            sb.table("songs").update(updates).eq("id", song_id).execute()
            print(f"Updated song {song_id}: {updates}")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))
    main()

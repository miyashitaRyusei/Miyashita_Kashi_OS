import os
import json
from supabase import create_client
import google.generativeai as genai
from pydantic import BaseModel
from dotenv import load_dotenv

# Pydanticモデル
class NewMetricsResult(BaseModel):
    perspective_score: float
    narrative_score: float
    cynicism_score: float

def main():
    load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))
    
    sb_url = os.environ.get("SUPABASE_URL")
    sb_key = os.environ.get("SUPABASE_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY")
    
    if not all([sb_url, sb_key, gemini_key]):
        print("Missing env vars")
        return
        
    sb = create_client(sb_url, sb_key)
    genai.configure(api_key=gemini_key)
    
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        generation_config={"response_mime_type": "application/json"}
    )
    
    # すべての曲を取得
    songs_res = sb.table("songs").select("id, title, artist").execute()
    songs = songs_res.data
    
    print(f"Found {len(songs)} songs to backfill.")
    
    for song in songs:
        song_id = song["id"]
        title = song["title"]
        artist = song["artist"]
        
        # セクションから歌詞を再構築
        sec_res = sb.table("sections").select("id").eq("song_id", song_id).order("order_index").execute()
        sections = sec_res.data
        
        full_lyrics = []
        for sec in sections:
            lines_res = sb.table("lines").select("text").eq("section_id", sec["id"]).order("line_number").execute()
            for line in lines_res.data:
                full_lyrics.append(line["text"])
            full_lyrics.append("") # セクション間の空行
            
        lyrics_text = "\n".join(full_lyrics)
        
        prompt = f"""あなたはプロの作詞アナリストです。
以下の歌詞を読み、3つの作家性指標を採点してください。
JSONスキーマ（NewMetricsResult）に従って出力してください。

- perspective_score: 視点の広さを -1.0（極めてミクロ・自分の半径1m）〜 1.0（極めてマクロ・社会や宇宙）の小数で判定。
- narrative_score: 物語性を -1.0（一瞬の感情や情景の切り取り・叙情的）〜 1.0（時間の進行や起承転結が明確なストーリー）の小数で判定。
- cynicism_score: 皮肉度を -1.0（純粋・ストレートな表現）〜 1.0（極めて皮肉・自嘲的・ひねくれている）の小数で判定。

【楽曲】: {title} / {artist}
【歌詞】:
{lyrics_text}
"""
        
        try:
            print(f"Analyzing: {title}")
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=NewMetricsResult,
                    temperature=0.2,
                )
            )
            result = json.loads(response.text)
            
            # Update DB
            updates = {
                "perspective_score": result["perspective_score"],
                "narrative_score": result["narrative_score"],
                "cynicism_score": result["cynicism_score"],
            }
            sb.table("songs").update(updates).eq("id", song_id).execute()
            print(f"  -> Updated: {updates}")
            
        except Exception as e:
            print(f"Failed to analyze {title}: {e}")

if __name__ == "__main__":
    main()

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Sparkles, Lightbulb, Music } from "lucide-react";
import { analyzeLyrics, getSongStatus } from "@/lib/api";

export default function EditorPage() {
  const router = useRouter();
  const [title, setTitle] = useState("無題のドキュメント");
  const [artist, setArtist] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // タイマー用の参照
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clockTimerRef = useRef<NodeJS.Timeout | null>(null);

  const sectionCount = lyrics
    .split("\n")
    .filter((line) => /^\[.+\]\s*$/.test(line.trim())).length;

  // ============================================
  // 解析リクエスト開始
  // ============================================
  const handleAnalyze = async () => {
    if (!lyrics.trim()) {
      alert("歌詞を入力してください");
      return;
    }

    setIsAnalyzing(true);
    setPollingError(null);
    setElapsedTime(0);

    try {
      // セクション分割の簡易ロジック
      const lines = lyrics.split("\n");
      const sections: { section_name: string; lyrics_raw: string }[] = [];
      const tagPattern = /^\[(.+?)\]\s*$/;
      let currentName = "全体";
      let currentLines: string[] = [];

      const hasTags = lines.some((line) => tagPattern.test(line.trim()));

      if (hasTags) {
        currentName = ""; 
        for (const line of lines) {
          const match = line.trim().match(tagPattern);
          if (match) {
            if (currentName && currentLines.length > 0) {
              sections.push({
                section_name: currentName,
                lyrics_raw: currentLines.join("\n").trim(),
              });
            }
            currentName = match[1];
            currentLines = [];
          } else {
            currentLines.push(line);
          }
        }
        if (currentName && currentLines.length > 0) {
          sections.push({
            section_name: currentName,
            lyrics_raw: currentLines.join("\n").trim(),
          });
        }
      } else {
        let sectionIndex = 1;
        for (const line of lines) {
          if (line.trim() === "") {
            if (currentLines.length > 0) {
              sections.push({
                section_name: `セクション${sectionIndex}`,
                lyrics_raw: currentLines.join("\n").trim(),
              });
              sectionIndex++;
              currentLines = [];
            }
          } else {
            currentLines.push(line);
          }
        }
        if (currentLines.length > 0) {
          sections.push({
            section_name: sections.length === 0 ? "全体" : `セクション${sectionIndex}`,
            lyrics_raw: currentLines.join("\n").trim(),
          });
        }
      }

      // 1. APIに投げてジョブID(song_id)を受け取る
      const result = await analyzeLyrics({
        title: title || "無題",
        artist: artist || "不明",
        sections,
      });

      // 2. ポーリングを開始
      if (result.status === "processing") {
        setPollingJobId(result.id);
      } else if (result.status === "completed") {
        router.push(`/songs/${result.id}`);
      }

    } catch (error) {
      console.error("解析リクエストエラー:", error);
      setPollingError("解析リクエストに失敗しました。");
      setIsAnalyzing(false);
    }
  };

  // ============================================
  // ポーリング & タイマー処理
  // ============================================
  useEffect(() => {
    // ジョブが無いなら何もしない
    if (!pollingJobId) return;

    // 経過時間のカウント
    clockTimerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    // ポーリング関数
    const pollStatus = async () => {
      try {
        const { analysis_status } = await getSongStatus(pollingJobId);
        
        if (analysis_status === "completed") {
          // 成功！詳細ページへ飛ぶ
          cleanupTimers();
          router.push(`/songs/${pollingJobId}`);
        } else if (analysis_status === "error") {
          // エラー
          cleanupTimers();
          setPollingError("LLM推論中にエラーが発生しました。");
          setIsAnalyzing(false);
          setPollingJobId(null);
        }
        // processingの場合は何もしない（次回を待つ）
      } catch (err) {
        console.error("ポーリングエラー:", err);
      }
    };

    // 3秒に1回ポーリング
    pollTimerRef.current = setInterval(pollStatus, 3000);

    // クリーンアップ
    return () => cleanupTimers();
  }, [pollingJobId, router]);

  const cleanupTimers = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (clockTimerRef.current) clearInterval(clockTimerRef.current);
  };

  const handleCancel = () => {
    cleanupTimers();
    setIsAnalyzing(false);
    setPollingJobId(null);
    setPollingError(null);
  };


  // ============================================
  // レンダリング
  // ============================================

  // 解析中モード
  if (isAnalyzing && pollingJobId) {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center bg-[#fbfbfa]">
        <div className="max-w-md w-full bg-white border border-[#e9e9e7] rounded-xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 border-[3px] border-[#d4d4d2] border-t-[#37352f] rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-[18px] font-bold text-[#37352f] mb-2">Gemini推論中...</h2>
          <p className="text-[13px] text-[#787774] mb-6 leading-relaxed">
            作詞ルールとレトリックを抽出しています。<br/>
            セクション数によっては数分かかる場合があります。<br/>
            （経過時間: {elapsedTime}秒）
          </p>
          <button 
            onClick={handleCancel}
            className="text-[12px] text-[#9ca3af] hover:text-[#37352f] underline"
          >
            キャンセルしてエディタに戻る
          </button>
        </div>
      </div>
    );
  }

  // 通常のエディタモード
  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-center py-12 px-8 bg-white relative">
      <div className="w-full max-w-3xl">
        {pollingError && (
          <div className="mb-6 bg-red-50 text-red-600 border border-red-200 rounded-lg p-4 text-[13px] flex items-center justify-between">
            <span>⚠️ {pollingError}</span>
            <button onClick={() => setPollingError(null)} className="font-bold">×</button>
          </div>
        )}

        {/* ヘッダー */}
        <div className="mb-10">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-4xl font-bold text-[#37352f] placeholder-[#d4d4d2] bg-transparent border-none focus:outline-none focus:ring-0 mb-4 transition-colors"
            placeholder="無題のドキュメント"
          />
          <div className="flex items-center gap-2 text-[#787774]">
            <Music size={16} />
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="flex-1 bg-transparent border-none text-[15px] focus:outline-none focus:ring-0 placeholder-[#d4d4d2]"
              placeholder="アーティスト名を追加..."
            />
          </div>
        </div>

        {/* Tips パネル */}
        <div className="mb-6 bg-[#f7f7f5] border border-[#e9e9e7] rounded-lg p-4 flex items-start gap-3">
          <Lightbulb size={18} className="text-[#eab308] flex-shrink-0 mt-0.5" />
          <div className="text-[13px] text-[#787774] leading-relaxed">
            <strong className="text-[#37352f]">セクション分割のヒント: </strong>
            <code className="bg-white px-1 py-0.5 rounded border border-[#e9e9e7] text-[#ef4444] font-mono mx-1">
              [1A]
            </code>
            や
            <code className="bg-white px-1 py-0.5 rounded border border-[#e9e9e7] text-[#ef4444] font-mono mx-1">
              [サビ]
            </code>
            のように、ブラケットで囲んだ行を入れると自動でセクションが分割されます。
            タグがない場合は、空行を基準に分割されます。
          </div>
        </div>

        {/* エディタ */}
        <div className="relative group mb-32">
          <textarea
            className="w-full min-h-[50vh] text-[#37352f] bg-transparent border-none resize-none focus:outline-none focus:ring-0 leading-loose text-[15px]"
            placeholder={`[1A]\n冷たい炎が 胸を焦がす\n昨日の君が 遠ざかる\n\n[サビ]\n忘れないよ あの日の空\n僕らが見た 永遠の光`}
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            disabled={isAnalyzing}
          />
        </div>
      </div>

      {/* フローティング アクションバー */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 ml-32 z-10">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !lyrics.trim()}
          className="flex items-center gap-2.5 bg-[#37352f] text-white px-6 py-3 rounded-full shadow-lg text-[14px] font-medium hover:bg-black hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg transition-all duration-200"
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              解析準備中...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              {sectionCount > 0
                ? `${sectionCount}セクションを解析する`
                : "解析を実行する"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

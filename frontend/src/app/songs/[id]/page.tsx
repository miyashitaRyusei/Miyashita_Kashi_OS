"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Music, Clock, Copy, Check, Rewind, Play, FastForward, Shuffle, Smile, Meh, Frown } from "lucide-react";
import type { Song } from "@/types";
import { fetchSongById, fetchSongs, updateSongMeta } from "@/lib/api";
import { formatSongAsMarkdown, copyToClipboard } from "@/lib/export";
import SectionAccordion from "@/components/song-detail/SectionAccordion";
import SectionTrajectoryChart from "@/components/song-detail/SectionTrajectoryChart";
import SongComparisonRadar from "@/components/song-detail/SongComparisonRadar";

// ============================================
// 定数
// ============================================

const TIMELINE_LABELS: Record<string, { text: string; icon: React.ReactNode }> = {
  past: { text: "過去", icon: <Rewind size={20} className="text-[#9ca3af]" /> },
  present: { text: "現在", icon: <Play size={20} className="text-[#9ca3af]" /> },
  future: { text: "未来", icon: <FastForward size={20} className="text-[#9ca3af]" /> },
  mixed: { text: "混合", icon: <Shuffle size={20} className="text-[#9ca3af]" /> },
};

const COLLOQUIAL_STYLES: Record<string, { text: string; color: string }> = {
  colloquial: { text: "口語", color: "bg-orange-50 text-orange-600 border-orange-200" },
  intermediate: { text: "中間", color: "bg-blue-50 text-blue-600 border-blue-200" },
  poetic: { text: "詩的", color: "bg-purple-50 text-purple-600 border-purple-200" },
};

// ============================================
// ページコンポーネント
// ============================================

export default function SongDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [song, setSong] = useState<SongWithDetails | null>(null);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editArtist, setEditArtist] = useState("");

  // ============================================
  // データ取得
  // ============================================

  useEffect(() => {
    if (id) loadSong();
  }, [id]);

  const loadSong = async () => {
    const cacheKey = `kashi_os_song_${id}`;
    const allSongsCacheKey = "kashi_os_songs_cache";
    const cached = localStorage.getItem(cacheKey);
    const cachedAllSongs = localStorage.getItem(allSongsCacheKey);
    
    if (cached) {
      try {
        setSong(JSON.parse(cached));
        if (cachedAllSongs) setAllSongs(JSON.parse(cachedAllSongs));
        setLoading(false);
      } catch (e) {
        // パース失敗時は無視
      }
    } else {
      setLoading(true);
    }

    setError(null);
    try {
      // 楽曲詳細と全楽曲リストを並行して取得
      const [data, allData] = await Promise.all([
        fetchSongById(id),
        fetchSongs(),
      ]);
      setSong(data);
      setAllSongs(allData);
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(allSongsCacheKey, JSON.stringify(allData));
    } catch (err) {
      console.error("楽曲の取得に失敗しました:", err);
      setError("楽曲の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleEditMeta = () => {
    if (!song) return;
    setEditTitle(song.title || "");
    setEditArtist(song.artist || "");
    setIsEditingMeta(true);
  };

  const handleSaveMeta = async () => {
    if (!song) return;
    try {
      await updateSongMeta(song.id, editTitle, editArtist);
      setSong({ ...song, title: editTitle, artist: editArtist });
      setIsEditingMeta(false);
    } catch (err) {
      alert("更新に失敗しました");
      console.error(err);
    }
  };

  // ============================================
  // LLMエクスポート
  // ============================================

  const handleExport = async () => {
    if (!song) return;
    const md = formatSongAsMarkdown(song);
    const success = await copyToClipboard(md);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ============================================
  // ローディング / エラー
  // ============================================

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-[#d4d4d2] border-t-[#37352f] rounded-full animate-spin" />
        <span className="text-[13px] text-[#9ca3af]">読み込み中...</span>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="text-[48px]">🎵</div>
        <p className="text-[#787774] text-[14px]">
          {error || "楽曲が見つかりませんでした"}
        </p>
        <button
          onClick={() => router.push("/")}
          className="text-[13px] text-[#37352f] hover:underline flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          ダッシュボードに戻る
        </button>
      </div>
    );
  }

  // ============================================
  // メインレンダリング
  // ============================================

  const sentimentEmoji =
    (song.sentiment_score ?? 0) > 0.3
      ? <Smile size={24} className="text-emerald-500" />
      : (song.sentiment_score ?? 0) < -0.3
      ? <Frown size={24} className="text-blue-500" />
      : <Meh size={24} className="text-amber-500" />;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* =============================== */}
        {/* 戻るボタン */}
        {/* =============================== */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-[13px] text-[#787774] hover:text-[#37352f] transition-colors mb-6 group"
        >
          <ArrowLeft
            size={14}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          楽曲データベース
        </button>

        {/* =============================== */}
        {/* ヘッダー */}
        {/* =============================== */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            {isEditingMeta ? (
              <div className="flex flex-col gap-2 max-w-md">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-2xl font-bold text-[#37352f] border border-[#e9e9e7] rounded-md px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="タイトル"
                />
                <input
                  type="text"
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  className="text-[15px] text-[#787774] border border-[#e9e9e7] rounded-md px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="アーティスト"
                />
                <div className="flex gap-2 mt-1">
                  <button onClick={handleSaveMeta} className="px-3 py-1 bg-emerald-600 text-white text-[12px] rounded font-bold hover:bg-emerald-700">保存</button>
                  <button onClick={() => setIsEditingMeta(false)} className="px-3 py-1 bg-[#efefed] text-[#787774] text-[12px] rounded font-bold hover:bg-[#e9e9e7]">キャンセル</button>
                </div>
              </div>
            ) : (
              <div className="group relative flex items-start">
                <h1 className="text-3xl font-bold text-[#37352f] flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 cursor-pointer" onClick={handleEditMeta}>
                  <div className="flex items-center gap-3">
                    <Music size={28} className="text-[#9ca3af] flex-shrink-0" />
                    {song.title}
                  </div>
                  <p className="text-[15px] text-[#787774] sm:mt-1.5 ml-10 sm:ml-0 font-normal">
                    {song.artist}
                  </p>
                </h1>
                <button 
                  onClick={handleEditMeta}
                  className="ml-2 mt-1.5 opacity-0 group-hover:opacity-100 text-[#9ca3af] hover:text-[#37352f] transition-opacity"
                  title="タイトル・アーティストを編集"
                >
                  <span className="text-[11px] font-bold border border-[#e9e9e7] px-1.5 py-0.5 rounded shadow-sm bg-white">編集</span>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleExport}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md border transition-all flex-shrink-0 ${
              copied
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-[#37352f] text-[#37352f] hover:bg-[#37352f] hover:text-white"
            }`}
          >
            {copied ? (
              <>
                <Check size={14} />
                コピー完了！
              </>
            ) : (
              <>
                <Copy size={14} />
                LLMエクスポート
              </>
            )}
          </button>
        </div>

        {/* =============================== */}
        {/* メタデータカード */}
        {/* =============================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {/* 感情極性 */}
          <div className="border border-[#e9e9e7] rounded-lg p-4 hover:border-[#d4d4d2] transition-colors">
            <div className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-2">
              感情極性
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50">{sentimentEmoji}</div>
              <span className="text-2xl font-bold text-[#37352f] font-mono">
                {song.sentiment_score !== null
                  ? `${song.sentiment_score > 0 ? "+" : ""}${song.sentiment_score.toFixed(2)}`
                  : "—"}
              </span>
            </div>
            <div className="mt-2 w-full h-1.5 bg-[#e9e9e7] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${((song.sentiment_score ?? 0) + 1) * 50}%`,
                  background:
                    (song.sentiment_score ?? 0) > 0
                      ? "#22c55e"
                      : (song.sentiment_score ?? 0) < 0
                      ? "#ef4444"
                      : "#eab308",
                }}
              />
            </div>
          </div>

          {/* 時間軸 */}
          <div className="border border-[#e9e9e7] rounded-lg p-4 hover:border-[#d4d4d2] transition-colors">
            <div className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-2 flex items-center gap-1">
              <Clock size={10} />
              時間軸
            </div>
            {song.timeline ? (
              <>
                <div className="text-2xl font-bold text-[#37352f] flex items-center gap-2">
                  {TIMELINE_LABELS[song.timeline]?.icon || <Clock size={20} className="text-[#9ca3af]" />}
                  <span className="text-[18px]">
                    {TIMELINE_LABELS[song.timeline]?.text || song.timeline}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-[#d4d4d2]">—</div>
                <div className="text-[11px] text-[#c4c4c2] mt-1">未解析</div>
              </>
            )}
          </div>

          {/* 抽象/具体 */}
          <div className="border border-[#e9e9e7] rounded-lg p-4 hover:border-[#d4d4d2] transition-colors">
            <div className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-2">
              抽象/具体
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              {[1, 2, 3, 4].map((dot) => (
                <div
                  key={dot}
                  className={`w-4 h-4 rounded-full transition-colors ${
                    dot <= (song.abstract_balance_score ?? 0)
                      ? "bg-[#37352f]"
                      : "bg-[#e9e9e7]"
                  }`}
                />
              ))}
            </div>
            <div className="text-[12px] text-[#787774]">
              {song.abstract_balance_score !== null
                ? `${song.abstract_balance_score}/4`
                : "未解析"}
            </div>
          </div>

          {/* 口語度 */}
          <div className="border border-[#e9e9e7] rounded-lg p-4 hover:border-[#d4d4d2] transition-colors">
            <div className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-2">
              口語度
            </div>
            {song.colloquial_level ? (
              <>
                <span
                  className={`inline-block px-2.5 py-1 rounded-md text-[14px] font-semibold border ${
                    COLLOQUIAL_STYLES[song.colloquial_level]?.color ||
                    "bg-gray-50"
                  }`}
                >
                  {COLLOQUIAL_STYLES[song.colloquial_level]?.text ||
                    song.colloquial_level}
                </span>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-[#d4d4d2]">—</div>
                <div className="text-[11px] text-[#c4c4c2] mt-1">未解析</div>
              </>
            )}
          </div>
        </div>

        {/* =============================== */}
        {/* 情報密度バー */}
        {/* =============================== */}
        {song.information_density !== null && (
          <div className="border border-[#e9e9e7] rounded-lg p-4 mb-8 hover:border-[#d4d4d2] transition-colors">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">
                楽曲全体の情報密度
              </span>
              <span className="text-[16px] font-bold font-mono text-[#37352f]">
                {song.information_density.toFixed(4)}
              </span>
            </div>
            <div className="w-full h-2 bg-[#e9e9e7] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#787774] to-[#37352f] rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(song.information_density * 200, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* =============================== */}
        {/* セクション推移グラフ */}
        {/* =============================== */}
        {song.sections && song.sections.length > 0 && (
          <SectionTrajectoryChart sections={song.sections} />
        )}

        {/* =============================== */}
        {/* DNA相対比較グラフ */}
        {/* =============================== */}
        <SongComparisonRadar currentSong={song} allSongs={allSongs} />

        {/* =============================== */}
        {/* セクション一覧 */}
        {/* =============================== */}
        <div>
          <h2 className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider mb-4">
            セクション一覧 ({song.sections?.length ?? 0})
          </h2>
          <div className="space-y-3">
            {song.sections && song.sections.length > 0 ? (
              song.sections
                .sort((a, b) => a.order_index - b.order_index)
                .map((section, idx) => (
                  <SectionAccordion
                    key={section.id || `sec-${idx}`}
                    section={section}
                    defaultOpen={idx === 0}
                  />
                ))
            ) : (
              <div className="border border-dashed border-[#e9e9e7] rounded-lg py-16 text-center">
                <div className="text-[36px] mb-3">📝</div>
                <p className="text-[#9ca3af] text-[14px]">
                  セクションデータがありません
                </p>
                <p className="text-[#c4c4c2] text-[12px] mt-1">
                  エディタから歌詞を解析してください
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

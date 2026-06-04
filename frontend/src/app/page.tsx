"use client";

import { useState, useEffect, useMemo } from "react";
import { Database, LayoutList, ScatterChart as ScatterIcon } from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
} from "recharts";
import type { Song } from "@/types";
import { fetchSongs, deleteSong, updateSongLike } from "@/lib/api";
import SongFilterBar from "@/components/dashboard/SongFilterBar";
import type { Filters } from "@/components/dashboard/SongFilterBar";
import SongDataGrid from "@/components/dashboard/SongDataGrid";
import LLMExportButton from "@/components/dashboard/LLMExportButton";

// ============================================
// 型定義
// ============================================

type ViewMode = "list" | "map";

// ============================================
// ページコンポーネント
// ============================================

export default function DashboardPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>({
    artist: "",
    isLiked: null,
    colloquialLevel: "",
  });

  // ============================================
  // データ取得
  // ============================================

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    setLoading(true);
    try {
      const data = await fetchSongs();
      setSongs(data);
    } catch (err) {
      console.error("楽曲の取得に失敗しました:", err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // フィルタリング
  // ============================================

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      // テキスト検索（タイトル + アーティスト）
      if (filters.artist) {
        const query = filters.artist.toLowerCase();
        if (
          !song.artist.toLowerCase().includes(query) &&
          !song.title.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      // Like フィルタ
      if (filters.isLiked !== null && song.is_liked !== filters.isLiked) {
        return false;
      }
      // 口語度フィルタ
      if (
        filters.colloquialLevel &&
        song.colloquial_level !== filters.colloquialLevel
      ) {
        return false;
      }
      return true;
    });
  }, [songs, filters]);

  // ============================================
  // 散布図データ
  // ============================================

  const scatterData = useMemo(() => {
    return filteredSongs
      .filter(
        (s) =>
          s.abstract_balance_score !== null &&
          s.information_density !== null
      )
      .map((s) => ({
        id: s.id,
        name: s.title,
        artist: s.artist,
        x: s.abstract_balance_score ?? 2,
        y: s.information_density ?? 0,
        isLiked: s.is_liked,
      }));
  }, [filteredSongs]);

  // ============================================
  // アクション
  // ============================================

  const handleDelete = async (id: string) => {
    if (!confirm("この楽曲を削除しますか？")) return;
    try {
      await deleteSong(id);
      setSongs((prev) => prev.filter((s) => s.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error("削除に失敗しました:", err);
    }
  };

  const handleToggleLike = async (id: string, isLiked: boolean) => {
    // 楽観的更新
    setSongs((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_liked: isLiked } : s))
    );
    try {
      await updateSongLike(id, isLiked);
    } catch (err) {
      console.error("Like更新に失敗しました:", err);
      // ロールバック
      setSongs((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_liked: !isLiked } : s))
      );
    }
  };

  // ============================================
  // カスタム散布図ツールチップ
  // ============================================

  const ScatterTooltipContent = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-[#e9e9e7] rounded-lg shadow-lg px-3 py-2.5 text-[12px]">
        <div className="font-semibold text-[#37352f]">{data.name}</div>
        <div className="text-[#787774] text-[11px]">{data.artist}</div>
        <div className="mt-1.5 space-y-0.5 text-[11px] text-[#787774]">
          <div>抽象/具体: {data.x}/4</div>
          <div>情報密度: {data.y.toFixed(4)}</div>
        </div>
      </div>
    );
  };

  // ============================================
  // レンダリング
  // ============================================

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* =============================== */}
        {/* ページヘッダー */}
        {/* =============================== */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#37352f] flex items-center gap-2.5">
              <Database size={22} className="text-[#787774]" />
              楽曲データベース
            </h1>
            <p className="text-[13px] text-[#9ca3af] mt-1">
              {filteredSongs.length}
              {filteredSongs.length !== songs.length
                ? ` / ${songs.length}`
                : ""}
              曲
            </p>
          </div>

          <div className="flex items-center gap-3">
            <LLMExportButton selectedIds={selectedIds} />

            {/* ビュー切り替えトグル */}
            <div className="flex items-center border border-[#e9e9e7] rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 transition-colors ${
                  viewMode === "list"
                    ? "bg-[#37352f] text-white"
                    : "bg-white text-[#787774] hover:bg-[#efefed]"
                }`}
                title="List View"
              >
                <LayoutList size={16} />
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`p-1.5 transition-colors ${
                  viewMode === "map"
                    ? "bg-[#37352f] text-white"
                    : "bg-white text-[#787774] hover:bg-[#efefed]"
                }`}
                title="Map View"
              >
                <ScatterIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* =============================== */}
        {/* フィルタバー */}
        {/* =============================== */}
        <div className="mb-5">
          <SongFilterBar filters={filters} onFilterChange={setFilters} />
        </div>

        {/* =============================== */}
        {/* メインコンテンツ */}
        {/* =============================== */}
        {loading ? (
          <div className="py-24 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#d4d4d2] border-t-[#37352f] rounded-full animate-spin" />
            <span className="text-[13px] text-[#9ca3af]">読み込み中...</span>
          </div>
        ) : viewMode === "list" ? (
          /* ======= List View ======= */
          <SongDataGrid
            songs={filteredSongs}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onDelete={handleDelete}
            onToggleLike={handleToggleLike}
          />
        ) : (
          /* ======= Map View (散布図) ======= */
          <div className="border border-[#e9e9e7] rounded-lg p-6 bg-[#fbfbfa]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[14px] font-semibold text-[#37352f]">
                  文体DNAマップ
                </h3>
                <p className="text-[11px] text-[#787774] mt-0.5">
                  X軸: 抽象/具体バランス（左: 抽象的 ⇔ 右: 具象的） ／ Y軸:
                  情報密度（下: 低い ⇔ 上: 高い）
                </p>
              </div>
              {/* 凡例 */}
              <div className="flex items-center gap-4 text-[11px] text-[#787774]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block" />
                  Like
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#c4c4c2] inline-block" />
                  Unlike
                </span>
              </div>
            </div>

            {scatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height={380}>
                <ScatterChart
                  margin={{ top: 10, right: 30, bottom: 20, left: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e9e9e7"
                    vertical={true}
                  />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="抽象/具体"
                    domain={[0.5, 4.5]}
                    ticks={[1, 2, 3, 4]}
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#e9e9e7" }}
                    tickFormatter={(v: number) =>
                      v === 1
                        ? "抽象的"
                        : v === 2
                        ? "やや抽象"
                        : v === 3
                        ? "やや具象"
                        : "具象的"
                    }
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="情報密度"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#e9e9e7" }}
                    width={50}
                  />
                  <ZAxis type="category" dataKey="name" name="タイトル" />
                  <Tooltip
                    content={<ScatterTooltipContent />}
                    cursor={{ strokeDasharray: "3 3", stroke: "#c4c4c2" }}
                  />
                  <Scatter data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isLiked ? "#ef4444" : "#c4c4c2"}
                        stroke={entry.isLiked ? "#dc2626" : "#a5a5a2"}
                        strokeWidth={1}
                        r={7}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-20 text-center text-[#9ca3af] text-[13px]">
                メタデータのある楽曲がありません
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

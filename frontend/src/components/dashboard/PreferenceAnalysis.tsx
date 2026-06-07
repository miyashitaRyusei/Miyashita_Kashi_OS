"use client";

import { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { Sparkles, Lightbulb } from "lucide-react";
import type { Song } from "@/types";

// ============================================
// Props
// ============================================

interface PreferenceAnalysisProps {
  songs: Song[];
}

// ============================================
// スケーリングロジック (0〜100に正規化)
// ============================================

function scaleScore(key: string, value: any): number {
  if (value === null || value === undefined) return 50; // デフォルト中間

  switch (key) {
    case "sentiment_score":
    case "perspective_score":
    case "narrative_score":
    case "cynicism_score":
      // -1.0 to 1.0 -> 0 to 100
      return ((value as number) + 1) * 50;
      
    case "abstract_balance_score":
      // 1.0 to 4.0 -> 0 to 100
      return (((value as number) - 1) / 3) * 100;
      
    case "information_density":
      // 0.0 to 0.4(approx max) -> 0 to 100
      return Math.min(((value as number) / 0.4) * 100, 100);
      
    case "colloquial_level":
      // poetic(-1), intermediate(0), colloquial(1)
      if (value === "poetic") return 0;
      if (value === "intermediate") return 50;
      if (value === "colloquial") return 100;
      return 50;
      
    case "timeline":
      // past(-1), present/mixed(0), future(1)
      if (value === "past") return 0;
      if (value === "future") return 100;
      return 50;
      
    default:
      return 50;
  }
}

const AXIS_CONFIG = [
  { key: "narrative_score", label: "物語性" },
  { key: "cynicism_score", label: "皮肉度" },
  { key: "colloquial_level", label: "口語度" },
  { key: "sentiment_score", label: "ポジティブ" },
  { key: "timeline", label: "未来志向" },
  { key: "perspective_score", label: "マクロ視点" },
  { key: "abstract_balance_score", label: "具象的" },
  { key: "information_density", label: "情報密度" },
];

// ============================================
// コンポーネント
// ============================================

export default function PreferenceAnalysis({ songs }: PreferenceAnalysisProps) {
  const likedSongs = songs.filter((s) => s.is_liked);
  const unlikedSongs = songs.filter((s) => !s.is_liked);

  // ============================================
  // データ集計
  // ============================================
  const radarData = useMemo(() => {
    if (songs.length === 0) return [];

    const calculateAverages = (targetSongs: Song[]) => {
      const avgs: Record<string, number> = {};
      AXIS_CONFIG.forEach(({ key }) => {
        if (targetSongs.length === 0) {
          avgs[key] = 50; // no data fallback
          return;
        }
        const sum = targetSongs.reduce((acc, song) => acc + scaleScore(key, (song as any)[key]), 0);
        avgs[key] = sum / targetSongs.length;
      });
      return avgs;
    };

    const likedAvgs = calculateAverages(likedSongs);
    const unlikedAvgs = calculateAverages(unlikedSongs);

    return AXIS_CONFIG.map(({ key, label }) => ({
      subject: label,
      like: Math.round(likedAvgs[key]),
      unlike: Math.round(unlikedAvgs[key]),
    }));
  }, [likedSongs, unlikedSongs, songs.length]);

  // インサイト生成
  const insights = useMemo(() => {
    if (likedSongs.length === 0 || unlikedSongs.length === 0) return null;
    
    // 差分が最大の項目を探す
    let maxDiff = -1;
    let maxKey = "";
    let maxLabel = "";
    let isLikeHigher = true;

    radarData.forEach((data) => {
      const diff = Math.abs(data.like - data.unlike);
      if (diff > maxDiff) {
        maxDiff = diff;
        maxKey = data.subject;
        maxLabel = data.subject;
        isLikeHigher = data.like > data.unlike;
      }
    });

    if (maxDiff < 10) return "まだ明確な好みの偏りは見られません。もっと多くの曲をLike/Unlikeしてみましょう。";

    return `あなたのLike曲は、Unlike曲に比べて「${maxLabel}」が ${isLikeHigher ? "高い" : "低い"} 傾向にあります（差分: ${Math.round(maxDiff)}pt）。`;
  }, [radarData, likedSongs.length, unlikedSongs.length]);

  if (songs.length === 0) return null;

  return (
    <div className="border border-[#e9e9e7] rounded-lg p-6 bg-[#fbfbfa] mt-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-[#37352f] flex items-center gap-2">
          <Sparkles size={18} className="text-emerald-500" /> Like傾向分析 (Your Preferences)
        </h3>
        <p className="text-[13px] text-[#787774] mt-1">
          あなたが「Like」した曲と、そうでない曲の平均的なDNAスコアを比較します。
        </p>
      </div>

      {likedSongs.length === 0 ? (
        <div className="text-center py-10 text-[#787774] bg-white rounded-lg border border-[#e9e9e7]">
          まだLikeされた曲がありません。リストから好きな曲に「Like」をつけてみてください！
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* レーダーチャート */}
          <div className="flex-1 bg-white p-4 rounded-lg border border-[#e9e9e7]">
            <h4 className="text-sm font-semibold text-[#37352f] mb-4 text-center">文体DNAシルエット</h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#e9e9e7" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#787774", fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e9e9e7", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Radar name="Like曲" dataKey="like" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} />
                  {unlikedSongs.length > 0 && (
                    <Radar name="Unlike曲" dataKey="unlike" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                  )}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 横棒グラフ & インサイト */}
          <div className="flex-1 flex flex-col gap-4">
            {/* インサイトパネル */}
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] p-4 rounded-lg text-[#166534] text-[13px]">
              <div className="font-bold mb-1 flex items-center gap-1.5">
                <Lightbulb size={16} /> AI インサイト
              </div>
              <p>{insights || "比較データが不足しています。"}</p>
            </div>

            {/* バーチャート */}
            <div className="flex-1 bg-white p-4 rounded-lg border border-[#e9e9e7]">
              <h4 className="text-sm font-semibold text-[#37352f] mb-4">指標ごとの平均値比較</h4>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={radarData}
                    margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e9e9e7" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: "#787774", fontSize: 10 }} />
                    <YAxis dataKey="subject" type="category" width={80} tick={{ fill: "#37352f", fontSize: 11 }} />
                    <Tooltip
                      cursor={{ fill: "#fbfbfa" }}
                      contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e9e9e7", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                    <Bar name="Like" dataKey="like" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={8} />
                    {unlikedSongs.length > 0 && (
                      <Bar name="Unlike" dataKey="unlike" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={8} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

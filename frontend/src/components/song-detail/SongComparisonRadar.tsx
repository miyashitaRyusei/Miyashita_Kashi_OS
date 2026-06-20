"use client";

import { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";
import { Sparkles } from "lucide-react";
import type { Song } from "@/types";
import type { SongWithDetails } from "@/lib/api";

// ============================================
// Props
// ============================================

interface SongComparisonRadarProps {
  currentSong: SongWithDetails;
  allSongs: Song[];
}

// ============================================
// スケーリングロジック (0〜100に正規化)
// ============================================

function scaleScore(key: string, value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 50;

  switch (key) {
    case "sentiment_score":
    case "perspective_score":
    case "narrative_score":
    case "cynicism_score":
      return ((value as number) + 1) * 50;
      
    case "abstract_balance_score":
      return (((value as number) - 1) / 3) * 100;
      
    case "information_density":
      return Math.min(((value as number) / 0.4) * 100, 100);
      
    case "colloquial_level":
      if (value === "poetic") return 0;
      if (value === "intermediate") return 50;
      if (value === "colloquial") return 100;
      return 50;
      
    case "timeline":
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

export default function SongComparisonRadar({ currentSong, allSongs }: SongComparisonRadarProps) {
  const likedSongs = allSongs.filter((s) => s.is_liked && s.id !== currentSong.id);
  const unlikedSongs = allSongs.filter((s) => !s.is_liked && s.id !== currentSong.id);

  const radarData = useMemo(() => {
    const calculateAverages = (targetSongs: Song[]) => {
      const avgs: Record<string, number> = {};
      AXIS_CONFIG.forEach(({ key }) => {
        if (targetSongs.length === 0) {
          avgs[key] = 50;
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sum = targetSongs.reduce((acc, song) => acc + scaleScore(key, (song as any)[key]), 0);
        avgs[key] = sum / targetSongs.length;
      });
      return avgs;
    };

    const likedAvgs = calculateAverages(likedSongs);
    const unlikedAvgs = calculateAverages(unlikedSongs);

    return AXIS_CONFIG.map(({ key, label }) => {
      return {
        subject: label,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        current: scaleScore(key, (currentSong as any)[key]),
        likedAvg: likedAvgs[key],
        unlikedAvg: unlikedAvgs[key],
      };
    });
  }, [currentSong, likedSongs, unlikedSongs]);

  if (!allSongs || allSongs.length === 0) return null;

  return (
    <div className="border border-[#e9e9e7] rounded-lg p-5 bg-[#fbfbfa] hover:border-[#d4d4d2] transition-colors mb-8">
      <h3 className="text-[12px] font-bold text-[#9ca3af] uppercase tracking-wider mb-2 flex items-center gap-2">
        <Sparkles size={14} /> 楽曲DNAの相対的位置づけ
      </h3>
      <p className="text-[11px] text-[#9ca3af] mb-4">
        この楽曲が、これまでに分析したお気に入り曲(Like)やその他の曲(Unlike)の平均と比べてどのような位置にあるかを示します。
      </p>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="#e9e9e7" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#787774", fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            
            {/* Unlike 平均 */}
            <Radar
              name="Unlike平均"
              dataKey="unlikedAvg"
              stroke="#9ca3af"
              fill="#9ca3af"
              fillOpacity={0.1}
              strokeDasharray="3 3"
            />
            {/* Like 平均 */}
            <Radar
              name="Like平均"
              dataKey="likedAvg"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.15}
            />
            {/* 今回の楽曲 */}
            <Radar
              name="この楽曲"
              dataKey="current"
              stroke="#ec4899"
              fill="#ec4899"
              fillOpacity={0.4}
              strokeWidth={2}
            />
            
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e9e9e7', fontSize: '11px', padding: '8px' }}
              itemStyle={{ padding: '2px 0' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => typeof value === 'number' ? Math.round(value) : value}
            />
            <Legend 
              wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
              iconType="circle"
              iconSize={6}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

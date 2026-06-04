"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Section } from "@/types";

// ============================================
// Props
// ============================================

interface DensityRadarChartProps {
  section: Section;
}

// ============================================
// コンポーネント
// ============================================

export default function DensityRadarChart({ section }: DensityRadarChartProps) {
  const data = [
    { label: "名詞", value: section.noun_density ?? 0 },
    { label: "動詞", value: section.verb_density ?? 0 },
    { label: "形容詞", value: section.adj_density ?? 0 },
    { label: "副詞", value: section.adv_density ?? 0 },
    { label: "内容語", value: section.content_word_density ?? 0 },
  ];

  const maxValue = Math.max(...data.map((d) => d.value), 0.1);

  // データが全てゼロの場合のフォールバック表示
  const allZero = data.every((d) => d.value === 0);
  if (allZero) {
    return (
      <div className="flex items-center justify-center h-[220px] text-[13px] text-[#9ca3af]">
        密度データがありません
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="#e9e9e7" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fill: "#787774", fontSize: 11, fontWeight: 500 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, Math.ceil(maxValue * 100) / 100]}
            tick={{ fill: "#c4c4c2", fontSize: 9 }}
            axisLine={false}
            tickCount={4}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e9e9e7",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              fontSize: "12px",
              padding: "8px 12px",
            }}
            formatter={(value: any) => {
              const numValue = typeof value === 'number' ? value : 0;
              return [`${(numValue * 100).toFixed(1)}%`, "密度"];
            }}
          />
          <Radar
            dataKey="value"
            stroke="#37352f"
            fill="#37352f"
            fillOpacity={0.12}
            strokeWidth={2}
            dot={{
              r: 3,
              fill: "#37352f",
              strokeWidth: 0,
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

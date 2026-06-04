"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Section } from "@/types";

interface SectionTrajectoryChartProps {
  sections: Section[];
}

const TIMELINE_LABELS: Record<string, string> = {
  past: "過去",
  present: "現在",
  future: "未来",
  mixed: "混合",
};

const COLLOQUIAL_LABELS: Record<string, string> = {
  colloquial: "口語",
  intermediate: "中間",
  poetic: "詩的",
};

export default function SectionTrajectoryChart({
  sections,
}: SectionTrajectoryChartProps) {
  if (!sections || sections.length === 0) return null;

  // 順番にソート
  const sorted = [...sections].sort((a, b) => a.order_index - b.order_index);

  // グラフ用のデータ作成
  const data = sorted.map((sec, i) => {
    // 時間軸: 過去=-1, 現在/混合=0, 未来=1
    let timelineVal = 0;
    if (sec.timeline === "past") timelineVal = -1;
    if (sec.timeline === "future") timelineVal = 1;

    // 口語度: 詩的=-1, 中間=0, 口語=1
    let colloqVal = 0;
    if (sec.colloquial_level === "colloquial") colloqVal = 1;
    if (sec.colloquial_level === "poetic") colloqVal = -1;

    return {
      name: sec.section_type || `Sec ${i + 1}`,
      sentiment: sec.sentiment_score ?? 0,
      abstract: sec.abstract_balance_score ?? 0,
      density: sec.content_word_density ?? 0,
      timelineVal,
      colloqVal,
      // ツールチップ表示用の元の文字列
      timelineOriginal: TIMELINE_LABELS[sec.timeline || ""] || sec.timeline || "未解析",
      colloqOriginal: COLLOQUIAL_LABELS[sec.colloquial_level || ""] || sec.colloquial_level || "未解析",
    };
  });

  const CustomTooltip1 = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-[#e9e9e7] p-3 rounded-lg shadow-sm text-[12px] min-w-[150px]">
          <p className="font-bold text-[#37352f] mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-4 py-0.5">
              <span style={{ color: entry.color }}>{entry.name}</span>
              <span className="font-mono text-[#37352f] font-medium">
                {Number(entry.value).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomTooltip2 = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-white border border-[#e9e9e7] p-3 rounded-lg shadow-sm text-[12px] min-w-[150px]">
          <p className="font-bold text-[#37352f] mb-2">{label}</p>
          <div className="flex justify-between items-center gap-4 py-0.5">
            <span style={{ color: "#8b5cf6" }}>時間軸</span>
            <span className="font-medium text-[#37352f]">{dataPoint.timelineOriginal}</span>
          </div>
          <div className="flex justify-between items-center gap-4 py-0.5">
            <span style={{ color: "#ec4899" }}>口語度</span>
            <span className="font-medium text-[#37352f]">{dataPoint.colloqOriginal}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 mb-8">
      {/* グラフ1: 感情・具象度・情報密度 */}
      <div className="border border-[#e9e9e7] rounded-lg p-5 bg-[#fbfbfa] hover:border-[#d4d4d2] transition-colors">
        <h3 className="text-[12px] font-bold text-[#9ca3af] uppercase tracking-wider mb-4 flex items-center gap-2">
          📈 楽曲展開の推移（感情・具象度・情報密度）
        </h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9e9e7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={{ stroke: "#e9e9e7" }} tickLine={false} />
              
              <YAxis yAxisId="left" domain={[-1, 1]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 4]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              
              <Tooltip content={<CustomTooltip1 />} cursor={{ stroke: '#e9e9e7', strokeWidth: 2 }} />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} iconType="circle" iconSize={6} />
              
              <Line yAxisId="left" type="monotone" dataKey="sentiment" name="感情極性" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
              <Line yAxisId="right" type="monotone" dataKey="abstract" name="具象度 (1~4)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
              <Line yAxisId="left" type="monotone" dataKey="density" name="情報密度" stroke="#10b981" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* グラフ2: 時間軸・口語度 */}
      <div className="border border-[#e9e9e7] rounded-lg p-5 bg-[#fbfbfa] hover:border-[#d4d4d2] transition-colors">
        <h3 className="text-[12px] font-bold text-[#9ca3af] uppercase tracking-wider mb-4 flex items-center gap-2">
          🧭 時間軸・口語度の推移
        </h3>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9e9e7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={{ stroke: "#e9e9e7" }} tickLine={false} />
              <YAxis domain={[-1.5, 1.5]} ticks={[-1, 0, 1]} tickFormatter={(val) => val === 1 ? "未来/口語" : val === 0 ? "現在/中間" : "過去/詩的"} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={80} />
              
              <Tooltip content={<CustomTooltip2 />} cursor={{ stroke: '#e9e9e7', strokeWidth: 2 }} />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} iconType="circle" iconSize={6} />
              
              <Line type="stepAfter" dataKey="timelineVal" name="時間軸" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
              <Line type="stepAfter" dataKey="colloqVal" name="口語度" stroke="#ec4899" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronRight, Hash } from "lucide-react";
import type { SectionWithDetails } from "@/lib/api";
import ProseCompareView from "./ProseCompareView";
import RhetoricHighlight from "./RhetoricHighlight";
import DensityRadarChart from "./DensityRadarChart";

// ============================================
// Props
// ============================================

interface SectionAccordionProps {
  section: SectionWithDetails;
  defaultOpen?: boolean;
}

// ============================================
// コンポーネント
// ============================================

export default function SectionAccordion({
  section,
  defaultOpen = false,
}: SectionAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const lineCount = section.lines?.length ?? 0;
  const rhetoricCount = section.rhetoric?.length ?? 0;

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        isOpen
          ? "border-[#d4d4d2] shadow-sm"
          : "border-[#e9e9e7] hover:border-[#d4d4d2]"
      }`}
    >
      {/* =============================== */}
      {/* ヘッダー（常時表示） */}
      {/* =============================== */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#fbfbfa] px-4 py-3 flex items-center justify-between hover:bg-[#f5f5f3] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <ChevronRight
            size={16}
            className={`text-[#9ca3af] transition-transform duration-200 ${
              isOpen ? "rotate-90" : ""
            }`}
          />
          <span className="font-semibold text-[14px] text-[#37352f]">
            {section.section_type}
          </span>

          {/* メトリクスバッジ群 */}
          <div className="flex items-center gap-2 ml-1">
            <span className="text-[11px] text-[#9ca3af] flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded border border-[#e9e9e7]">
              <Hash size={10} />
              {section.total_mora}モーラ
            </span>
            <span className="text-[11px] text-[#9ca3af] bg-white px-1.5 py-0.5 rounded border border-[#e9e9e7]">
              {lineCount}行
            </span>
            {rhetoricCount > 0 && (
              <span className="text-[11px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                ✨ {rhetoricCount}
              </span>
            )}
          </div>
        </div>

        {/* 密度サマリー（右端） */}
        <div className="flex items-center gap-3 text-[11px] text-[#787774]">
          <span>
            名詞{" "}
            <strong className="text-[#37352f]">
              {((section.noun_density ?? 0) * 100).toFixed(0)}%
            </strong>
          </span>
          <span>
            動詞{" "}
            <strong className="text-[#37352f]">
              {((section.verb_density ?? 0) * 100).toFixed(0)}%
            </strong>
          </span>
          <span>
            内容語{" "}
            <strong className="text-[#37352f]">
              {((section.content_word_density ?? 0) * 100).toFixed(0)}%
            </strong>
          </span>
        </div>
      </button>

      {/* =============================== */}
      {/* 展開コンテンツ */}
      {/* =============================== */}
      {isOpen && (
        <div className="border-t border-[#e9e9e7] bg-white">
          <div className="p-5 space-y-6">
            {/* ① 対訳表示 */}
            <div>
              <h4 className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#37352f]" />
                歌詞 × 散文翻訳
              </h4>
              <ProseCompareView lines={section.lines || []} />
            </div>

            {/* ② レトリック + レーダーチャート の2カラム */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* レトリック */}
              <div>
                <h4 className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  抽出レトリック
                </h4>
                <RhetoricHighlight rhetoric={section.rhetoric || []} />
              </div>

              {/* レーダーチャート */}
              <div>
                <h4 className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  品詞密度
                </h4>
                <div className="border border-[#e9e9e7] rounded-lg p-3 bg-[#fbfbfa]">
                  <DensityRadarChart section={section} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

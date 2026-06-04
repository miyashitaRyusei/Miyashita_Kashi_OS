"use client";

import { useState } from "react";
import { Copy, ChevronDown, Check, FileText, FileJson } from "lucide-react";
import { fetchSongById } from "@/lib/api";
import type { SongWithDetails } from "@/lib/api";
import {
  formatSongsAsMarkdown,
  formatSongsAsJSON,
  copyToClipboard,
} from "@/lib/export";

// ============================================
// Props
// ============================================

interface LLMExportButtonProps {
  selectedIds: Set<string>;
}

// ============================================
// コンポーネント
// ============================================

export default function LLMExportButton({ selectedIds }: LLMExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const count = selectedIds.size;

  const handleExport = async (format: "markdown" | "json") => {
    if (count === 0) return;
    setExporting(true);
    setIsOpen(false);

    try {
      const songs: SongWithDetails[] = await Promise.all(
        Array.from(selectedIds).map((id) => fetchSongById(id))
      );

      const text =
        format === "markdown"
          ? formatSongsAsMarkdown(songs)
          : formatSongsAsJSON(songs);

      const success = await copyToClipboard(text);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("エクスポートに失敗しました:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative">
      {/* メインボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={count === 0 || exporting}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md border transition-all ${
          count > 0
            ? "border-[#37352f] text-[#37352f] hover:bg-[#37352f] hover:text-white"
            : "border-[#e9e9e7] text-[#d4d4d2] cursor-not-allowed"
        }`}
      >
        {copied ? (
          <>
            <Check size={14} className="text-emerald-500" />
            <span className="text-emerald-600">コピー完了！</span>
          </>
        ) : exporting ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            エクスポート中...
          </>
        ) : (
          <>
            <Copy size={14} />
            LLMエクスポート{count > 0 && ` (${count})`}
            <ChevronDown size={12} />
          </>
        )}
      </button>

      {/* ドロップダウン */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-[#e9e9e7] rounded-lg shadow-lg z-20 overflow-hidden">
            <div className="px-3 py-2 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider border-b border-[#e9e9e7]">
              コピー形式を選択
            </div>
            <button
              onClick={() => handleExport("markdown")}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-[#37352f] hover:bg-[#fbfbfa] transition-colors"
            >
              <FileText size={15} className="text-[#787774]" />
              <div className="text-left">
                <div className="font-medium">Markdown</div>
                <div className="text-[10px] text-[#9ca3af]">
                  対訳テーブル付き
                </div>
              </div>
            </button>
            <button
              onClick={() => handleExport("json")}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-[#37352f] hover:bg-[#fbfbfa] transition-colors border-t border-[#e9e9e7]"
            >
              <FileJson size={15} className="text-[#787774]" />
              <div className="text-left">
                <div className="font-medium">JSON</div>
                <div className="text-[10px] text-[#9ca3af]">
                  構造化データ
                </div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

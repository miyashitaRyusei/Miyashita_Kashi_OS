"use client";

import { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { fetchSongById } from "@/lib/api";
import type { SongWithDetails } from "@/lib/api";
import { formatPreferencePrompt, copyToClipboard } from "@/lib/export";

interface PreferenceExportButtonProps {
  selectedIds: Set<string>;
}

export default function PreferenceExportButton({ selectedIds }: PreferenceExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const count = selectedIds.size;

  const handleExport = async () => {
    if (count === 0) return;
    setExporting(true);

    try {
      const songs: SongWithDetails[] = await Promise.all(
        Array.from(selectedIds).map((id) => fetchSongById(id))
      );

      const text = formatPreferencePrompt(songs);

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
    <button
      onClick={handleExport}
      disabled={count === 0 || exporting}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-md border transition-all ${
        count > 0
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300"
          : "border-[#e9e9e7] bg-white text-[#d4d4d2] cursor-not-allowed"
      }`}
      title="選択した楽曲から作詞傾向を分析するプロンプトをコピーします"
    >
      {copied ? (
        <>
          <Check size={14} />
          <span>コピー完了！</span>
        </>
      ) : exporting ? (
        <>
          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>生成中...</span>
        </>
      ) : (
        <>
          <Sparkles size={14} />
          <span>好み分析プロンプトをコピー</span>
        </>
      )}
    </button>
  );
}

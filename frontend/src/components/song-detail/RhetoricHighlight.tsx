"use client";

import { useState, useEffect, useRef } from "react";
import type { Rhetoric } from "@/types";
import { Sparkles } from "lucide-react";
import { updateRhetoricContent } from "@/lib/api";

// ============================================
// 定数（レトリック種別のカラー）
// ============================================

const TYPE_STYLES: Record<string, string> = {
  "意味的摩擦": "bg-red-50 text-red-700 border-red-200",
  "高度な省略": "bg-amber-50 text-amber-700 border-amber-200",
  "高度な比喩": "bg-blue-50 text-blue-700 border-blue-200",
  "象徴": "bg-purple-50 text-purple-700 border-purple-200",
  "対比": "bg-emerald-50 text-emerald-700 border-emerald-200",
};

// ============================================
// Props
// ============================================

interface RhetoricHighlightProps {
  rhetoric: Rhetoric[];
}

// ============================================
// コンポーネント
// ============================================

export default function RhetoricHighlight({
  rhetoric: initialRhetoric,
}: RhetoricHighlightProps) {
  const [items, setItems] = useState(initialRhetoric);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setItems(initialRhetoric);
  }, [initialRhetoric]);

  if (!items || items.length === 0) {
    return (
      <div className="text-[13px] text-[#9ca3af] py-4 flex items-center gap-1.5">
        <Sparkles size={14} className="text-[#d4d4d2]" />
        特筆すべきレトリックは検出されませんでした
      </div>
    );
  }

  const startEditing = (rhetoric: Rhetoric) => {
    setEditingId(rhetoric.id);
    setEditValue(rhetoric.reason || "");
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        // 文字列の最後にカーソルを移動
        textareaRef.current.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length
        );
      }
    }, 0);
  };

  const commitEdit = async (id: string) => {
    setEditingId(null);
    const itemToUpdate = items.find((r) => r.id === id);
    if (!itemToUpdate || itemToUpdate.reason === editValue) return;

    const previousItems = [...items];
    setItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, reason: editValue } : r))
    );

    try {
      await updateRhetoricContent(id, editValue);
    } catch (error) {
      console.error("レトリックの更新に失敗しました:", error);
      setItems(previousItems);
      alert("保存に失敗しました。通信環境を確認してください。");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    // CMD+Enter or Ctrl+Enter で保存（テキストエリアのため）
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      commitEdit(id);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-2.5">
      {items.map((r, idx) => (
        <div
          key={r.id || `rhet-${idx}`}
          className="p-3.5 bg-[#fbfbfa] rounded-lg border border-[#e9e9e7] hover:shadow-sm transition-shadow group"
        >
          {/* 種別バッジ + フレーズ */}
          <div className="flex items-start gap-2 mb-2">
            <span
              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 mt-0.5 ${
                TYPE_STYLES[r.type] ||
                "bg-gray-50 text-gray-700 border-gray-200"
              }`}
            >
              {r.type}
            </span>
            <span className="text-[13px] font-semibold text-[#37352f] leading-snug">
              「{r.phrase}」
            </span>
          </div>

          {/* 理由 (インライン編集) */}
          <div 
            className={`pl-1 flex items-start gap-1.5 ${
              editingId === r.id ? "bg-white -ml-1.5 p-1.5 rounded border border-[#37352f]" : "cursor-pointer rounded -ml-1.5 p-1.5 hover:bg-[#f5f5f3] transition-colors"
            }`}
            onClick={() => {
              if (editingId !== r.id) startEditing(r);
            }}
          >
            <span className="text-[#c4c4c2] flex-shrink-0 mt-0.5">💡</span>
            
            {editingId === r.id ? (
              <div className="w-full">
                <textarea
                  ref={textareaRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(r.id)}
                  onKeyDown={(e) => handleKeyDown(e, r.id)}
                  className="w-full text-[12px] text-[#37352f] bg-transparent outline-none resize-none leading-relaxed min-h-[60px]"
                />
                <div className="text-[9px] text-[#9ca3af] mt-1 text-right">
                  Cmd/Ctrl + Enter to save, Esc to cancel
                </div>
              </div>
            ) : (
              <span className="text-[12px] text-[#787774] leading-relaxed">
                {r.reason || <span className="italic text-[#d4d4d2]">理由が未入力です</span>}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

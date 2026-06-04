"use client";

import { useState, useRef, useEffect } from "react";
import type { Line } from "@/types";
import { updateLineProse } from "@/lib/api";

// ============================================
// 定数（母音カラーマッピング）
// ============================================

const VOWEL_COLORS: Record<string, string> = {
  a: "bg-red-50 text-red-600 border-red-200",
  i: "bg-blue-50 text-blue-600 border-blue-200",
  u: "bg-emerald-50 text-emerald-600 border-emerald-200",
  e: "bg-amber-50 text-amber-600 border-amber-200",
  o: "bg-purple-50 text-purple-600 border-purple-200",
};

// ============================================
// Props
// ============================================

interface ProseCompareViewProps {
  lines: Line[];
}

// ============================================
// コンポーネント
// ============================================

export default function ProseCompareView({ lines: initialLines }: ProseCompareViewProps) {
  // 楽観的更新用のローカルState
  const [lines, setLines] = useState(initialLines);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 外部からの更新を同期
  useEffect(() => {
    setLines(initialLines);
  }, [initialLines]);

  if (!lines || lines.length === 0) {
    return (
      <div className="text-[13px] text-[#9ca3af] py-6 text-center border border-dashed border-[#e9e9e7] rounded-lg">
        行データがありません
      </div>
    );
  }

  // 編集モードに入る
  const startEditing = (line: Line) => {
    setEditingId(line.id);
    setEditValue(line.prose_text || "");
    // レンダリング直後にフォーカスを当てるため setTimeout を使用
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // 変更を保存して編集モードを抜ける
  const commitEdit = async (id: string) => {
    setEditingId(null);
    const lineToUpdate = lines.find((l) => l.id === id);
    if (!lineToUpdate || lineToUpdate.prose_text === editValue) return;

    // 楽観的更新（UIを先に更新）
    const previousLines = [...lines];
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, prose_text: editValue } : l))
    );

    try {
      await updateLineProse(id, editValue);
    } catch (error) {
      console.error("散文翻訳の更新に失敗しました:", error);
      // 失敗したらロールバック
      setLines(previousLines);
      alert("保存に失敗しました。通信環境を確認してください。");
    }
  };

  // キーボード操作対応 (Enterで保存、Escapeでキャンセル)
  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      commitEdit(id);
    } else if (e.key === "Escape") {
      setEditingId(null); // 変更を破棄して閉じる
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-[#e9e9e7]">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-[#fbfbfa] border-b border-[#e9e9e7]">
            <th className="px-3 py-2.5 text-[10px] font-bold text-[#9ca3af] text-left uppercase tracking-wider w-8">
              #
            </th>
            <th className="px-3 py-2.5 text-[10px] font-bold text-[#9ca3af] text-left uppercase tracking-wider w-[35%]">
              Original Lyrics
            </th>
            <th className="px-3 py-2.5 text-[10px] font-bold text-[#9ca3af] text-left uppercase tracking-wider border-l border-[#e9e9e7]">
              Prose Translation <span className="text-[9px] font-normal lowercase ml-1">(click to edit)</span>
            </th>
            <th className="px-3 py-2.5 text-[10px] font-bold text-[#9ca3af] text-center uppercase tracking-wider w-16">
              モーラ
            </th>
            <th className="px-3 py-2.5 text-[10px] font-bold text-[#9ca3af] text-center uppercase tracking-wider w-12">
              韻
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => (
            <tr
              key={line.id || `line-${idx}`}
              className="border-b border-[#f0f0ee] last:border-0 hover:bg-[#fafaf9] transition-colors group"
            >
              {/* 行番号 */}
              <td className="px-3 py-2.5 text-[11px] text-[#c4c4c2] font-mono">
                {line.line_number}
              </td>

              {/* 元の歌詞 */}
              <td className="px-3 py-2.5 text-[#37352f] font-medium leading-relaxed">
                {line.text}
              </td>

              {/* 散文翻訳 (インライン編集可能) */}
              <td 
                className={`px-0 py-0 border-l border-[#f0f0ee] relative ${
                  editingId === line.id ? "bg-white" : "cursor-pointer"
                }`}
                onClick={() => {
                  if (editingId !== line.id) startEditing(line);
                }}
              >
                {editingId === line.id ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => commitEdit(line.id)}
                    onKeyDown={(e) => handleKeyDown(e, line.id)}
                    className="w-full h-full px-3 py-2.5 bg-transparent outline-none ring-1 ring-inset ring-[#37352f] text-[#37352f]"
                  />
                ) : (
                  <div className="px-3 py-2.5 text-[#787774] leading-relaxed group-hover:bg-[#f5f5f3] transition-colors min-h-[40px]">
                    {line.prose_text || (
                      <span className="text-[#d4d4d2] italic text-[12px]">未翻訳</span>
                    )}
                  </div>
                )}
              </td>

              {/* モーラ数 */}
              <td className="px-3 py-2.5 text-center">
                <span className="inline-block px-1.5 py-0.5 bg-[#f7f7f5] text-[#4b5563] rounded text-[11px] font-mono border border-[#e9e9e7] min-w-[28px]">
                  {line.mora_count}
                </span>
              </td>

              {/* 末尾母音 */}
              <td className="px-3 py-2.5 text-center">
                {line.end_vowel ? (
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold border ${
                      VOWEL_COLORS[line.end_vowel.toLowerCase()] ||
                      "bg-gray-50 text-gray-500 border-gray-200"
                    }`}
                  >
                    {line.end_vowel.toUpperCase()}
                  </span>
                ) : (
                  <span className="text-[#d4d4d2]">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

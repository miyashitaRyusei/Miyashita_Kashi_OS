"use client";

import { useState, useEffect } from "react";
import { Sprout, Trash2, Copy, Check, MessageSquarePlus } from "lucide-react";
import { fetchIdeaSeeds, createIdeaSeed, updateIdeaSeed, deleteIdeaSeed } from "@/lib/api";
import type { IdeaSeed } from "@/types";

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<IdeaSeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"単語" | "フレーズ">("単語");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 初回読み込み
  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    setLoading(true);
    try {
      const data = await fetchIdeaSeeds();
      setIdeas(data);
    } catch (e) {
      console.error("Failed to load ideas:", e);
    } finally {
      setLoading(false);
    }
  };

  // 保存処理
  const handleSave = async () => {
    if (!inputText.trim()) return;
    setIsSubmitting(true);
    try {
      const newIdea = await createIdeaSeed(inputText.trim(), selectedCategory, "");
      setIdeas([newIdea, ...ideas]);
      setInputText("");
    } catch (e) {
      alert("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // エンターキーでの保存（PC用、スマホの確定キーでも発火するよう工夫）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 変換中のエンターを弾くために nativeEvent.isComposing を確認
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSave();
    }
  };

  // クリップボードにコピー
  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // メモの更新
  const handleUpdateMemo = async (idea: IdeaSeed, newMemo: string) => {
    try {
      const updated = await updateIdeaSeed(idea.id, idea.content, idea.category, newMemo);
      setIdeas(ideas.map(i => i.id === updated.id ? updated : i));
    } catch (e) {
      console.error("Failed to update memo:", e);
    }
  };

  // 削除処理
  const handleDelete = async (id: string) => {
    if (!confirm("このアイデアを削除しますか？")) return;
    try {
      await deleteIdeaSeed(id);
      setIdeas(ideas.filter(i => i.id !== id));
    } catch (e) {
      alert("削除に失敗しました");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#fbfbfa]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* =============================== */}
        {/* ヘッダー */}
        {/* =============================== */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[#37352f] flex items-center gap-2.5">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
              <Sprout size={24} />
            </div>
            アイデアの種
          </h1>
          <p className="text-[13px] text-[#787774] mt-2 ml-1">
            ふと浮かんだ言葉やフレーズを書き留める、あなただけのストック帳。
          </p>
        </div>

        {/* =============================== */}
        {/* 入力エリア (スマホファーストな大きめUI) */}
        {/* =============================== */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e9e9e7] p-4 sm:p-5 mb-8">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="浮かんだ言葉を入力... (例: 夜風、走り出す君の背中)"
            className="w-full bg-transparent text-[15px] sm:text-[16px] text-[#37352f] placeholder:text-[#c4c4c2] focus:outline-none resize-none min-h-[80px]"
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#f0f0f0]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedCategory("単語")}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  selectedCategory === "単語"
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-[#fbfbfa] text-[#787774] border border-[#e9e9e7]"
                }`}
              >
                単語
              </button>
              <button
                onClick={() => setSelectedCategory("フレーズ")}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  selectedCategory === "フレーズ"
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-[#fbfbfa] text-[#787774] border border-[#e9e9e7]"
                }`}
              >
                フレーズ
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={!inputText.trim() || isSubmitting}
              className="bg-emerald-600 text-white px-5 py-2 rounded-full text-[14px] font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              保存する
            </button>
          </div>
        </div>

        {/* =============================== */}
        {/* アイデア一覧 (Masonry的、あるいはシンプルなグリッド) */}
        {/* =============================== */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-16 text-[#9ca3af]">
            <Sprout size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-[14px]">まだアイデアの種がありません。</p>
            <p className="text-[12px] mt-1">思いついた言葉を上のフォームから保存しましょう！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="bg-white rounded-xl shadow-sm border border-[#e9e9e7] p-4 flex flex-col group relative"
              >
                {/* カテゴリバッジ */}
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#fbfbfa] text-[#787774] border border-[#e9e9e7]">
                    {idea.category}
                  </span>
                </div>

                {/* 本文 */}
                <div className="pr-12 mb-4">
                  <p className="text-[15px] font-bold text-[#37352f] leading-relaxed whitespace-pre-wrap">
                    {idea.content}
                  </p>
                </div>

                {/* メモ欄 */}
                <div className="mt-auto pt-3 border-t border-[#fbfbfa] flex items-center">
                  <div className="flex-1 flex items-start gap-1.5 text-[#9ca3af]">
                    <MessageSquarePlus size={14} className="mt-0.5 shrink-0" />
                    <input
                      type="text"
                      placeholder="メモを追加..."
                      defaultValue={idea.memo || ""}
                      onBlur={(e) => {
                        if (e.target.value !== (idea.memo || "")) {
                          handleUpdateMemo(idea, e.target.value);
                        }
                      }}
                      className="bg-transparent text-[12px] text-[#787774] focus:outline-none w-full placeholder:text-[#d4d4d2]"
                    />
                  </div>
                </div>

                {/* アクションボタン (ホバー時または常に表示。スマホを考慮して常に薄く表示) */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(idea.id, idea.content)}
                    className="p-1.5 text-[#787774] hover:bg-emerald-50 hover:text-emerald-600 rounded-md transition-colors"
                    title="コピー"
                  >
                    {copiedId === idea.id ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                  <button
                    onClick={() => handleDelete(idea.id)}
                    className="p-1.5 text-[#787774] hover:bg-red-50 hover:text-red-500 rounded-md transition-colors"
                    title="削除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, BookOpen, Quote, Tag, Feather, Clock } from "lucide-react";
import type { LyricDraft, LyricPhrase, LyricRule } from "@/types";
import { fetchDrafts, createDraft, updateDraft, deleteDraft, fetchLyricPhrases, fetchLyricRules } from "@/lib/api";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function WritingPage() {
  const [drafts, setDrafts] = useState<LyricDraft[]>([]);
  const [activeDraft, setActiveDraft] = useState<LyricDraft | null>(null);
  
  // Editor state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // References state
  const [favoritePhrases, setFavoritePhrases] = useState<LyricPhrase[]>([]);
  const [favoriteRules, setFavoriteRules] = useState<LyricRule[]>([]);
  const [activeTab, setActiveTab] = useState<'phrases' | 'rules'>('phrases');
  const [phraseFilter, setPhraseFilter] = useState<'all' | 'start' | 'end'>('all');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [draftsData, phrasesData, rulesData] = await Promise.all([
        fetchDrafts(),
        fetchLyricPhrases(),
        fetchLyricRules()
      ]);
      setDrafts(draftsData);
      setFavoritePhrases(phrasesData.filter(p => p.is_favorite));
      setFavoriteRules(rulesData.filter(r => r.is_favorite));
      
      if (draftsData.length > 0) {
        selectDraft(draftsData[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectDraft = (draft: LyricDraft) => {
    setActiveDraft(draft);
    setTitle(draft.title);
    setContent(draft.content);
  };

  const handleCreateDraft = async () => {
    try {
      const newDraft = await createDraft("無題の草案", "");
      setDrafts([newDraft, ...drafts]);
      selectDraft(newDraft);
    } catch (e) {
      alert("草案の作成に失敗しました");
    }
  };

  useEffect(() => {
    if (!activeDraft) return;
    if (activeDraft.title === title && activeDraft.content === content) return;

    const timer = setTimeout(() => {
      handleAutoSave();
    }, 1500);

    return () => clearTimeout(timer);
  }, [title, content, activeDraft]);

  const handleAutoSave = async () => {
    if (!activeDraft) return;
    try {
      const updated = await updateDraft(activeDraft.id, title, content);
      setDrafts(prev => prev.map(d => d.id === updated.id ? updated : d));
      setActiveDraft(updated);
    } catch (e) {
      console.error("オートセーブに失敗しました", e);
    }
  };

  const handleSave = async () => {
    if (!activeDraft) return;
    setIsSaving(true);
    try {
      const updated = await updateDraft(activeDraft.id, title, content);
      setDrafts(drafts.map(d => d.id === updated.id ? updated : d));
      setActiveDraft(updated);
    } catch (e) {
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("本当にこの草案を削除しますか？")) return;
    try {
      await deleteDraft(id);
      const newDrafts = drafts.filter(d => d.id !== id);
      setDrafts(newDrafts);
      if (activeDraft?.id === id) {
        if (newDrafts.length > 0) {
          selectDraft(newDrafts[0]);
        } else {
          setActiveDraft(null);
          setTitle("");
          setContent("");
        }
      }
    } catch (err) {
      alert("削除に失敗しました");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><LoadingSpinner /></div>;
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#fbfbfa]">
      
      {/* 1. 左ペイン: 草案リスト */}
      <div className="w-64 border-r border-[#e9e9e7] bg-[#fbfbfa] flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-[#e9e9e7] flex items-center justify-between">
          <h2 className="font-bold text-[#37352f] text-[14px] flex items-center gap-1.5">
            <Feather size={16} /> 草案リスト
          </h2>
          <button onClick={handleCreateDraft} className="p-1 hover:bg-[#efefed] rounded text-[#787774] transition-colors" title="新規作成">
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {drafts.map(draft => (
            <div
              key={draft.id}
              onClick={() => selectDraft(draft)}
              className={`p-3 rounded-lg cursor-pointer transition-colors border group ${
                activeDraft?.id === draft.id 
                  ? "bg-emerald-50 border-emerald-200 shadow-sm" 
                  : "border-transparent hover:bg-[#efefed]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className={`font-semibold text-[13px] truncate ${activeDraft?.id === draft.id ? "text-emerald-800" : "text-[#37352f]"}`}>{draft.title || "無題の草案"}</h3>
                <button 
                  onClick={(e) => handleDelete(draft.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-[#c4c4c2] hover:text-red-500 transition-all flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center gap-1 mt-2 text-[11px] text-[#9ca3af]">
                <Clock size={10} />
                {formatDate(draft.updated_at)}
              </div>
            </div>
          ))}
          {drafts.length === 0 && (
            <div className="text-center p-4 text-[#9ca3af] text-[12px]">
              草案がありません
            </div>
          )}
        </div>
      </div>

      {/* 2. 中央ペイン: エディタ本体 */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
        {activeDraft ? (
          <>
            <div className="p-4 border-b border-[#e9e9e7] flex items-center justify-between bg-white z-10">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="無題の草案"
                className="text-xl font-bold text-[#37352f] placeholder-[#c4c4c2] focus:outline-none flex-1 bg-transparent"
              />
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="ml-4 flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white text-[13px] font-bold rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                {isSaving ? "保存中..." : "保存"}
              </button>
            </div>
            
            {/* クイックセクション挿入 */}
            <div className="px-4 py-2 border-b border-[#e9e9e7] bg-[#fbfbfa] flex gap-2 overflow-x-auto whitespace-nowrap">
              {['[1A]', '[1B]', '[サビ]', '[2A]', '[D]', '[落ちサビ]', '[大サビ]'].map(sec => (
                <button
                  key={sec}
                  onClick={() => setContent(prev => prev + (prev.endsWith('\n') || prev === '' ? sec + '\n' : '\n\n' + sec + '\n'))}
                  className="px-2 py-1 text-[11px] font-bold text-[#787774] bg-white border border-[#e9e9e7] rounded hover:border-[#c4c4c2] transition-colors"
                >
                  {sec}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="歌詞をここに入力..."
                className="w-full h-full p-8 resize-none focus:outline-none text-[15px] leading-relaxed text-[#37352f]"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#9ca3af] text-[13px]">
            左のリストから草案を選択するか、新しく作成してください
          </div>
        )}
      </div>

      {/* 3. 右ペイン: お気に入りリファレンス */}
      <div className="w-[450px] border-l border-[#e9e9e7] bg-[#fbfbfa] flex flex-col flex-shrink-0 overflow-hidden">
        <div className="flex p-2 border-b border-[#e9e9e7] bg-white gap-1">
          <button
            onClick={() => setActiveTab('phrases')}
            className={`flex-1 py-2 text-[14px] font-bold rounded-md transition-colors ${
              activeTab === 'phrases' ? 'bg-[#efefed] text-[#37352f]' : 'text-[#9ca3af] hover:text-[#787774]'
            }`}
          >
            お気に入りフレーズ
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-2 text-[14px] font-bold rounded-md transition-colors ${
              activeTab === 'rules' ? 'bg-[#efefed] text-[#37352f]' : 'text-[#9ca3af] hover:text-[#787774]'
            }`}
          >
            自分用メモ（ルール）
          </button>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'phrases' && (
            <div className="px-3 py-2 border-b border-[#e9e9e7] bg-white flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#9ca3af]">絞り込み:</span>
              <select
                value={phraseFilter}
                onChange={(e) => setPhraseFilter(e.target.value as any)}
                className="text-[12px] p-1 border border-[#e9e9e7] rounded bg-white text-[#37352f] focus:outline-none focus:ring-1 focus:ring-[#c4c4c2]"
              >
                <option value="all">すべて</option>
                <option value="start">書き出し</option>
                <option value="end">書き終わり</option>
              </select>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {activeTab === 'phrases' && (
              favoritePhrases.filter(p => phraseFilter === 'all' || p.phrase_type === phraseFilter).length > 0 ? 
                favoritePhrases.filter(p => phraseFilter === 'all' || p.phrase_type === phraseFilter).map(phrase => (
                <div key={`${phrase.phrase_type}_${phrase.text}`} className="p-3 bg-white border border-[#e9e9e7] rounded-lg shadow-sm group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded border ${phrase.phrase_type === 'start' ? 'border-amber-200 bg-amber-50 text-amber-600' : 'border-emerald-200 bg-emerald-50 text-emerald-600'}`}>
                        {phrase.phrase_type === 'start' ? '書き出し' : '書き終わり'}
                      </span>
                      <span className="text-[12px] font-bold text-[#787774] bg-[#efefed] px-2 py-1 rounded">
                        {phrase.category || '未分類'}
                      </span>
                    </div>
                    <button 
                      onClick={() => setContent(prev => prev + phrase.text)}
                      className="text-[#9ca3af] hover:text-blue-500 hover:bg-blue-50 p-1.5 rounded transition-colors"
                      title="エディタに挿入"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <h4 className="font-bold text-[#37352f] text-[16px] leading-tight text-center">
                    {phrase.text}
                  </h4>
                </div>
              )) : (
                <div className="text-center text-[14px] text-[#9ca3af] mt-4">該当するフレーズがありません</div>
              )
            )}

            {activeTab === 'rules' && (
              favoriteRules.length > 0 ? favoriteRules.map(rule => (
                <div key={rule.rule_name} className={`p-4 border rounded-lg shadow-sm ${rule.memo ? 'bg-yellow-50/50 border-yellow-300' : 'bg-white border-[#e9e9e7]'}`}>
                  <div className="flex items-start gap-1.5 mb-2">
                    <Tag size={14} className="text-[#9ca3af] mt-0.5" />
                    <span className="text-[12px] font-bold text-[#787774]">{rule.tag || '未分類'}</span>
                  </div>
                  <h4 className="font-bold text-[#37352f] text-[15px] leading-tight mb-2">
                    {rule.rule_name}
                  </h4>
                  {rule.description && (
                    <p className="text-[13px] text-[#787774] leading-relaxed mb-3">
                      {rule.description}
                    </p>
                  )}
                  {rule.memo && (
                    <div className="mt-3 p-3 bg-white/60 border border-yellow-200 rounded text-[13px] text-[#37352f] whitespace-pre-wrap leading-relaxed">
                      {rule.memo}
                    </div>
                  )}
                </div>
              )) : (
                <div className="text-center text-[12px] text-[#9ca3af] mt-4">お気に入りのルール（メモ）がありません</div>
              )
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
}

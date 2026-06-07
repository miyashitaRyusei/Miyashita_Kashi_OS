"use client";

import { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";
import type { LyricRule } from "@/types";
import { fetchLyricRules } from "@/lib/api";
import RuleGallery from "@/components/rules/RuleGallery";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function RulesPage() {
  const [rules, setRules] = useState<LyricRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [songLikeFilter, setSongLikeFilter] = useState<'all' | 'liked' | 'unliked'>('all');
  const [cardLikeFilter, setCardLikeFilter] = useState<'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isLikedParam: boolean | undefined = undefined;
    if (songLikeFilter === 'liked') isLikedParam = true;
    if (songLikeFilter === 'unliked') isLikedParam = false;
    loadRules(isLikedParam);
  }, [songLikeFilter]);

  const loadRules = async (isLiked?: boolean) => {
    setLoading(true);
    try {
      const data = await fetchLyricRules(isLiked);
      setRules(data);
    } catch (err) {
      console.error("ルールの取得に失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  const TAGS = ['すべて', '言葉選び・レトリック', '構成・展開', '視点・アプローチ', '感情・情景描写', 'リズム・響き', 'その他'];
  const [activeTag, setActiveTag] = useState<string>('すべて');

  const filteredRules = rules.filter(r => {
    if (activeTag !== 'すべて' && r.tag !== activeTag) return false;
    if (cardLikeFilter === 'favorites' && !r.is_favorite) return false;
    if (searchQuery && !r.rule_name.toLowerCase().includes(searchQuery.toLowerCase()) && !(r.description || "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#37352f] flex items-center gap-2.5">
              <BookOpen size={22} className="text-[#787774]" />
              作詞ルールブック
            </h1>
            <p className="text-[13px] text-[#9ca3af] mt-1">
              楽曲解析から抽出された、作詞における規則性やレトリックの知見。
            </p>
          </div>
          
          {/* フィルター群 */}
          <div className="flex flex-col sm:flex-row items-end gap-2">
            <select
              value={songLikeFilter}
              onChange={(e) => setSongLikeFilter(e.target.value as any)}
              className="px-3 py-2 text-[13px] font-medium rounded-lg border border-[#e9e9e7] bg-white text-[#37352f] focus:outline-none focus:ring-2 focus:ring-[#e9e9e7] cursor-pointer"
            >
              <option value="all">すべての曲から</option>
              <option value="liked">Likeした曲から</option>
              <option value="unliked">Likeしてない曲から</option>
            </select>
            
            <select
              value={cardLikeFilter}
              onChange={(e) => setCardLikeFilter(e.target.value as any)}
              className="px-3 py-2 text-[13px] font-medium rounded-lg border border-[#e9e9e7] bg-white text-[#37352f] focus:outline-none focus:ring-2 focus:ring-[#e9e9e7] cursor-pointer"
            >
              <option value="all">すべてのルール</option>
              <option value="favorites">お気に入りのみ</option>
            </select>
          </div>
        </div>

        {/* 検索バー */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="ルールを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 text-[14px] rounded-lg border border-[#e9e9e7] bg-white text-[#37352f] focus:outline-none focus:ring-2 focus:ring-[#e9e9e7]"
          />
        </div>

        {/* タグフィルターバー */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#e9e9e7] mb-6">
          {TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`px-3 py-1.5 text-[13px] rounded-md transition-colors whitespace-nowrap ${
                activeTag === tag
                  ? "bg-[#37352f] text-white font-medium"
                  : "text-[#787774] hover:bg-[#fbfbfa]"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20">
            <LoadingSpinner />
          </div>
        ) : (
          <RuleGallery 
            rules={filteredRules} 
            onRemove={(id) => setRules(prev => prev.filter(r => r.id !== id))}
          />
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { BookType } from "lucide-react";
import type { SentenceEnding } from "@/types";
import { fetchSentenceEndings } from "@/lib/api";
import EndingCategoryTabs from "@/components/endings/EndingCategoryTabs";
import EndingCard from "@/components/endings/EndingCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function EndingsPage() {
  const [endings, setEndings] = useState<SentenceEnding[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [likeFilter, setLikeFilter] = useState<'all' | 'favorites'>('all');
  const [songLikeFilter, setSongLikeFilter] = useState<'all' | 'liked' | 'unliked'>('all');
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isLikedParam: boolean | undefined = undefined;
    if (songLikeFilter === 'liked') isLikedParam = true;
    if (songLikeFilter === 'unliked') isLikedParam = false;
    loadEndings(isLikedParam);
  }, [songLikeFilter]);

  const loadEndings = async (isLiked?: boolean) => {
    setLoading(true);
    try {
      const data = await fetchSentenceEndings(undefined, isLiked);
      setEndings(data.sort((a, b) => b.appearance_count - a.appearance_count));
    } catch (err) {
      console.error("文末表現の取得に失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(endings.map(e => e.category))).filter((c): c is string => Boolean(c));
  
  const filteredEndings = endings.filter(e => {
    if (activeCategory && e.category !== activeCategory) return false;
    if (likeFilter === 'favorites' && !e.is_favorite) return false;
    if (searchQuery && !e.ending_text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#37352f] flex items-center gap-2.5">
              <BookType size={22} className="text-[#787774]" />
              文末表現辞書
            </h1>
            <p className="text-[13px] text-[#9ca3af] mt-1">
              作詞によく使われる文末表現とレトリックのパターン辞典。
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
              value={likeFilter}
              onChange={(e) => setLikeFilter(e.target.value as any)}
              className="px-3 py-2 text-[13px] font-medium rounded-lg border border-[#e9e9e7] bg-white text-[#37352f] focus:outline-none focus:ring-2 focus:ring-[#e9e9e7] cursor-pointer"
            >
              <option value="all">すべての文末表現</option>
              <option value="favorites">お気に入りのみ</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-20">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <input
                type="text"
                placeholder="文末表現を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 text-[14px] rounded-lg border border-[#e9e9e7] bg-white text-[#37352f] focus:outline-none focus:ring-2 focus:ring-[#e9e9e7]"
              />
            </div>
            
            <div className="mb-6">
              <EndingCategoryTabs 
                categories={categories} 
                activeCategory={activeCategory} 
                onSelect={setActiveCategory} 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEndings.map((ending) => (
                <EndingCard 
                  key={ending.id} 
                  ending={ending} 
                  onRemove={() => setEndings(prev => prev.filter(e => e.id !== ending.id))}
                />
              ))}
              {filteredEndings.length === 0 && (
                <div className="col-span-full py-12 text-center text-[#9ca3af] text-[13px]">
                  該当する文末表現がありません。
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

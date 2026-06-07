"use client";

import { useState, useEffect } from "react";
import { BookType } from "lucide-react";
import type { LyricPhrase } from "@/types";
import { fetchLyricPhrases } from "@/lib/api";
import PhraseGallery from "@/components/phrases/PhraseGallery";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const START_CATEGORIES = ['すべて', '情景・描写', '感情・内省', '行動・状態', '呼びかけ・対象', '時間・場面転換', 'その他'];
const END_CATEGORIES = ['すべて', '情景の余韻', '感情の着地', '行動の完了・継続', '問いかけ・願い', '断定・決意', 'その他'];

export default function PhrasesPage() {
  const [phrases, setPhrases] = useState<LyricPhrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<'start' | 'end'>('start');
  const [activeCategory, setActiveCategory] = useState<string>('すべて');
  const [songLikeFilter, setSongLikeFilter] = useState<'all' | 'liked' | 'unliked'>('all');
  const [cardLikeFilter, setCardLikeFilter] = useState<'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isLikedParam: boolean | undefined = undefined;
    if (songLikeFilter === 'liked') isLikedParam = true;
    if (songLikeFilter === 'unliked') isLikedParam = false;
    loadPhrases(isLikedParam);
  }, [songLikeFilter]);

  const loadPhrases = async (isLiked?: boolean) => {
    setLoading(true);
    try {
      const data = await fetchLyricPhrases(isLiked);
      setPhrases(data);
    } catch (err) {
      console.error("フレーズの取得に失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  // 1. タイプで絞り込み
  const typeFiltered = phrases.filter(p => p.phrase_type === activeType);
  
  // 2. カテゴリ・お気に入り・検索で絞り込み
  const finalFiltered = typeFiltered.filter(p => {
    if (activeCategory !== 'すべて' && p.category !== activeCategory) return false;
    if (cardLikeFilter === 'favorites' && !p.is_favorite) return false;
    if (searchQuery && !p.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const categories = activeType === 'start' ? START_CATEGORIES : END_CATEGORIES;

  const handleTypeChange = (type: 'start' | 'end') => {
    setActiveType(type);
    setActiveCategory('すべて'); // タイプを変えたらカテゴリをリセット
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#37352f] flex items-center gap-2.5">
              <BookType size={22} className="text-[#787774]" />
              フレーズ辞典
            </h1>
            <p className="text-[13px] text-[#9ca3af] mt-1">
              各セクションの書き出し・書き終わりに使われた自立語の塊をストックします。
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-end gap-3 self-start">
            <div className="flex gap-2">
              {/* 楽曲Likeフィルター */}
              <select
                value={songLikeFilter}
                onChange={(e) => setSongLikeFilter(e.target.value as any)}
                className="px-3 py-2 text-[13px] font-medium rounded-lg border border-[#e9e9e7] bg-white text-[#37352f] focus:outline-none focus:ring-2 focus:ring-[#e9e9e7] cursor-pointer"
              >
                <option value="all">すべての曲から</option>
                <option value="liked">Likeした曲から</option>
                <option value="unliked">Likeしてない曲から</option>
              </select>

              {/* カードお気に入りフィルター */}
              <select
                value={cardLikeFilter}
                onChange={(e) => setCardLikeFilter(e.target.value as any)}
                className="px-3 py-2 text-[13px] font-medium rounded-lg border border-[#e9e9e7] bg-white text-[#37352f] focus:outline-none focus:ring-2 focus:ring-[#e9e9e7] cursor-pointer"
              >
                <option value="all">すべてのフレーズ</option>
                <option value="favorites">お気に入りのみ</option>
              </select>
            </div>

            {/* 大トグル: 書き出し / 書き終わり */}
            <div className="flex bg-[#efefed] p-1 rounded-lg">
              <button
                onClick={() => handleTypeChange('start')}
                className={`px-5 py-2 text-[13px] font-bold rounded-md transition-all ${
                  activeType === 'start'
                    ? 'bg-white text-[#37352f] shadow-sm'
                    : 'text-[#9ca3af] hover:text-[#787774]'
                }`}
              >
                書き出し
              </button>
              <button
                onClick={() => handleTypeChange('end')}
                className={`px-5 py-2 text-[13px] font-bold rounded-md transition-all ${
                  activeType === 'end'
                    ? 'bg-white text-[#37352f] shadow-sm'
                    : 'text-[#9ca3af] hover:text-[#787774]'
                }`}
              >
                書き終わり
              </button>
            </div>
          </div>
        </div>

        {/* 検索バー */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="フレーズを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 text-[14px] rounded-lg border border-[#e9e9e7] bg-white text-[#37352f] focus:outline-none focus:ring-2 focus:ring-[#e9e9e7]"
          />
        </div>

        {/* タグフィルターバー */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#e9e9e7] mb-6">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-[13px] rounded-md transition-colors whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-[#37352f] text-white font-medium"
                  : "text-[#787774] hover:bg-[#fbfbfa]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20">
            <LoadingSpinner />
          </div>
        ) : (
          <PhraseGallery phrases={finalFiltered} />
        )}
      </div>
    </div>
  );
}

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

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await fetchLyricRules();
      setRules(data);
    } catch (err) {
      console.error("ルールの取得に失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  const TAGS = ['すべて', '言葉選び・レトリック', '構成・展開', '視点・アプローチ', '感情・情景描写', 'リズム・響き', 'その他'];
  const [activeTag, setActiveTag] = useState<string>('すべて');

  const filteredRules = activeTag === 'すべて' ? rules : rules.filter(r => r.tag === activeTag);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#37352f] flex items-center gap-2.5">
            <BookOpen size={22} className="text-[#787774]" />
            作詞ルールブック
          </h1>
          <p className="text-[13px] text-[#9ca3af] mt-1">
            楽曲解析から抽出された、作詞における規則性やレトリックの知見。
          </p>
        </div>

        {/* タグフィルターバー */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                activeTag === tag
                  ? 'bg-[#37352f] text-white border border-[#37352f]'
                  : 'bg-white text-[#787774] border border-[#e9e9e7] hover:border-[#d4d4d2] hover:bg-[#fbfbfa]'
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
          <RuleGallery rules={filteredRules} />
        )}
      </div>
    </div>
  );
}

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
      // NEWが先に来るようにソート
      setRules(data.sort((a, b) => (a.is_novel === b.is_novel ? 0 : a.is_novel ? -1 : 1)));
    } catch (err) {
      console.error("ルールの取得に失敗:", err);
    } finally {
      setLoading(false);
    }
  };

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

        {loading ? (
          <div className="py-20">
            <LoadingSpinner />
          </div>
        ) : (
          <RuleGallery rules={rules} />
        )}
      </div>
    </div>
  );
}

import type { LyricRule } from "@/types";
import { Quote, Tag, ChevronDown, ChevronUp, Heart, Trash2 } from "lucide-react";
import { useState } from "react";
import { updateDictionaryPreference } from "@/lib/api";

interface RuleCardProps {
  rule: LyricRule;
  onRemove?: () => void;
}

const TAG_STYLES: Record<string, string> = {
  '言葉選び・レトリック': 'bg-blue-50 text-blue-600 border-blue-200',
  '構成・展開': 'bg-emerald-50 text-emerald-600 border-emerald-200',
  '視点・アプローチ': 'bg-purple-50 text-purple-600 border-purple-200',
  '感情・情景描写': 'bg-rose-50 text-rose-600 border-rose-200',
  'リズム・響き': 'bg-amber-50 text-amber-600 border-amber-200',
  'その他': 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function RuleCard({ rule, onRemove }: RuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(rule.is_favorite || false);

  const handleFavorite = async () => {
    const nextVal = !isFavorite;
    setIsFavorite(nextVal);
    try {
      await updateDictionaryPreference('rule', rule.rule_name, nextVal, false);
    } catch (e) {
      console.error(e);
      setIsFavorite(!nextVal);
    }
  };

  const handleDelete = async () => {
    if (!confirm("このルールを非表示にしますか？")) return;
    try {
      await updateDictionaryPreference('rule', rule.rule_name, isFavorite, true);
      if (onRemove) onRemove();
    } catch (e) {
      alert("削除に失敗しました");
    }
  };

  const tagStyle = rule.tag && TAG_STYLES[rule.tag] ? TAG_STYLES[rule.tag] : TAG_STYLES['その他'];

  return (
    <div className="border border-[#e9e9e7] rounded-lg bg-white overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="p-4 border-b border-[#e9e9e7] bg-[#fbfbfa] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${tagStyle}`}>
            <Tag size={10} />
            {rule.tag || '未分類'}
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={handleFavorite} className={`p-1 rounded hover:bg-gray-100 transition-colors ${isFavorite ? 'text-red-500' : 'text-[#d4d4d2]'}`} title="お気に入り">
              <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
            </button>
            <button onClick={handleDelete} className="p-1 rounded hover:bg-gray-100 text-[#d4d4d2] hover:text-red-500 transition-colors" title="非表示にする">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <h3 className="font-bold text-[#37352f] text-[16px] leading-tight">
          {rule.rule_name}
        </h3>
      </div>
      
      <div className="p-4 flex-1 flex flex-col gap-4">
        {rule.description && (
          <p className="text-[13px] text-[#787774] leading-relaxed">
            {rule.description}
          </p>
        )}
        
        <div className="mt-auto pt-2">
          {rule.examples && rule.examples.length > 0 ? (
            <div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-[11px] font-bold text-[#9ca3af] hover:text-[#787774] transition-colors uppercase tracking-wider mb-2"
              >
                根拠フレーズ ({rule.examples.length})
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {isExpanded && (
                <div className="bg-[#f7f7f5] rounded-md p-3 border border-[#e9e9e7] relative mt-2">
                  <Quote size={12} className="text-[#d4d4d2] absolute top-2 left-2" />
                  <ul className="pl-4 space-y-1">
                    {rule.examples.map((ex, i) => (
                      <li key={i} className="text-[12px] text-[#37352f] font-medium leading-relaxed">
                        {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[12px] text-[#c4c4c2] italic">
              例がありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

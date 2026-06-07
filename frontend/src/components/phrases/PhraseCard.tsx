import type { LyricPhrase } from "@/types";
import { Quote, Tag, ChevronDown, ChevronUp, Heart, Trash2 } from "lucide-react";
import { useState } from "react";
import { updateDictionaryPreference } from "@/lib/api";

interface PhraseCardProps {
  phrase: LyricPhrase;
  onRemove?: () => void;
}

const CATEGORY_STYLES: Record<string, string> = {
  // start カテゴリ
  '情景・描写': 'bg-blue-50 text-blue-600 border-blue-200',
  '感情・内省': 'bg-purple-50 text-purple-600 border-purple-200',
  '行動・状態': 'bg-emerald-50 text-emerald-600 border-emerald-200',
  '呼びかけ・対象': 'bg-rose-50 text-rose-600 border-rose-200',
  '時間・場面転換': 'bg-amber-50 text-amber-600 border-amber-200',
  // end カテゴリ
  '情景の余韻': 'bg-indigo-50 text-indigo-600 border-indigo-200',
  '感情の着地': 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200',
  '行動の完了・継続': 'bg-teal-50 text-teal-600 border-teal-200',
  '問いかけ・願い': 'bg-pink-50 text-pink-600 border-pink-200',
  '断定・決意': 'bg-orange-50 text-orange-600 border-orange-200',
  // 共通
  'その他': 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function PhraseCard({ phrase, onRemove }: PhraseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(phrase.is_favorite || false);
  
  const handleFavorite = async () => {
    const nextVal = !isFavorite;
    setIsFavorite(nextVal);
    try {
      await updateDictionaryPreference('phrase', `${phrase.phrase_type}_${phrase.text}`, nextVal, false);
    } catch (e) {
      console.error(e);
      setIsFavorite(!nextVal);
    }
  };

  const handleDelete = async () => {
    if (!confirm("このフレーズを非表示にしますか？")) return;
    try {
      await updateDictionaryPreference('phrase', `${phrase.phrase_type}_${phrase.text}`, isFavorite, true);
      if (onRemove) onRemove();
    } catch (e) {
      alert("削除に失敗しました");
    }
  };
  
  const catStyle = phrase.category && CATEGORY_STYLES[phrase.category] 
    ? CATEGORY_STYLES[phrase.category] 
    : CATEGORY_STYLES['その他'];

  const textLength = phrase.text.length;
  let textSizeClass = "text-[18px]";
  if (textLength > 15) textSizeClass = "text-[13px]";
  else if (textLength > 10) textSizeClass = "text-[15px]";

  return (
    <div className="border border-[#e9e9e7] rounded-lg bg-white overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="p-4 border-b border-[#e9e9e7] bg-[#fbfbfa] flex flex-col gap-2 relative">
        <div className="flex items-start justify-between">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap flex-shrink-0 ${catStyle}`}>
            <Tag size={10} />
            {phrase.category || '未分類'}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[12px] font-medium text-[#9ca3af] mr-1 whitespace-nowrap">
              {phrase.appearance_count}回
            </span>
            <button onClick={handleFavorite} className={`p-1 rounded hover:bg-gray-100 transition-colors ${isFavorite ? 'text-red-500' : 'text-[#d4d4d2]'}`} title="お気に入り">
              <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
            </button>
            <button onClick={handleDelete} className="p-1 rounded hover:bg-gray-100 text-[#d4d4d2] hover:text-red-500 transition-colors" title="非表示にする">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <div className="pt-2 pb-1 relative">
          <Quote size={16} className="text-[#e9e9e7] absolute -top-1 -left-1" />
          <h3 className={`font-bold text-[#37352f] leading-tight text-center relative z-10 px-4 whitespace-nowrap overflow-hidden text-ellipsis ${textSizeClass}`}>
            {phrase.text}
          </h3>
          <Quote size={16} className="text-[#e9e9e7] absolute -bottom-1 -right-1 rotate-180" />
        </div>
      </div>
      
      <div className="px-4 py-2 flex-1 flex flex-col bg-white">
        <div className="mt-auto">
          {phrase.examples && phrase.examples.length > 0 ? (
            <div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-[11px] font-bold text-[#9ca3af] hover:text-[#787774] transition-colors uppercase tracking-wider"
              >
                抽出元の行例 ({phrase.examples.length})
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {isExpanded && (
                <ul className="space-y-1 mt-1.5">
                  {phrase.examples.map((ex, i) => (
                    <li key={i} className="text-[12px] text-[#787774] font-medium flex items-start gap-1.5">
                      <span className="text-[#c4c4c2] mt-0.5">•</span>
                      <span className="leading-relaxed">{ex}</span>
                    </li>
                  ))}
                </ul>
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

import type { LyricPhrase } from "@/types";
import { Quote, Tag } from "lucide-react";

interface PhraseCardProps {
  phrase: LyricPhrase;
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

export default function PhraseCard({ phrase }: PhraseCardProps) {
  const catStyle = phrase.category && CATEGORY_STYLES[phrase.category] 
    ? CATEGORY_STYLES[phrase.category] 
    : CATEGORY_STYLES['その他'];

  return (
    <div className="border border-[#e9e9e7] rounded-lg bg-white overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="p-4 border-b border-[#e9e9e7] bg-[#fbfbfa] flex flex-col gap-2 relative">
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${catStyle}`}>
            <Tag size={10} />
            {phrase.category || '未分類'}
          </span>
          <span className="text-[11px] font-medium text-[#9ca3af] bg-[#efefed] px-2 py-0.5 rounded-full">
            出現: {phrase.appearance_count}回
          </span>
        </div>
        <div className="pt-2 pb-1 relative">
          <Quote size={16} className="text-[#e9e9e7] absolute -top-1 -left-1" />
          <h3 className="font-bold text-[#37352f] text-[18px] leading-tight text-center relative z-10">
            {phrase.text}
          </h3>
          <Quote size={16} className="text-[#e9e9e7] absolute -bottom-1 -right-1 rotate-180" />
        </div>
      </div>
      
      <div className="p-4 flex-1 flex flex-col bg-white">
        <div className="mt-auto">
          <h4 className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-2">
            抽出元の行例
          </h4>
          {phrase.examples && phrase.examples.length > 0 ? (
            <ul className="space-y-1.5">
              {phrase.examples.slice(0, 3).map((ex, i) => (
                <li key={i} className="text-[12px] text-[#787774] font-medium flex items-start gap-1.5">
                  <span className="text-[#c4c4c2] mt-0.5">•</span>
                  <span className="leading-relaxed">{ex}</span>
                </li>
              ))}
              {phrase.examples.length > 3 && (
                <li className="text-[11px] text-[#c4c4c2] italic pl-3 pt-1">
                  ほか {phrase.examples.length - 3} 件...
                </li>
              )}
            </ul>
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

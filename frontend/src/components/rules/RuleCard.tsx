import type { LyricRule } from "@/types";
import { Quote, Tag } from "lucide-react";

interface RuleCardProps {
  rule: LyricRule;
}

const TAG_STYLES: Record<string, string> = {
  '言葉選び・レトリック': 'bg-blue-50 text-blue-600 border-blue-200',
  '構成・展開': 'bg-emerald-50 text-emerald-600 border-emerald-200',
  '視点・アプローチ': 'bg-purple-50 text-purple-600 border-purple-200',
  '感情・情景描写': 'bg-rose-50 text-rose-600 border-rose-200',
  'リズム・響き': 'bg-amber-50 text-amber-600 border-amber-200',
  'その他': 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function RuleCard({ rule }: RuleCardProps) {
  const tagStyle = rule.tag && TAG_STYLES[rule.tag] ? TAG_STYLES[rule.tag] : TAG_STYLES['その他'];

  return (
    <div className="border border-[#e9e9e7] rounded-lg bg-white overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="p-4 border-b border-[#e9e9e7] bg-[#fbfbfa] flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${tagStyle}`}>
            <Tag size={10} />
            {rule.tag || '未分類'}
          </span>
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
          <h4 className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-2">
            根拠フレーズ
          </h4>
          {rule.examples && rule.examples.length > 0 ? (
            <div className="bg-[#f7f7f5] rounded-md p-3 border border-[#e9e9e7] relative">
              <Quote size={12} className="text-[#d4d4d2] absolute top-2 left-2" />
              <ul className="pl-4 space-y-1">
                {rule.examples.map((ex, i) => (
                  <li key={i} className="text-[12px] text-[#37352f] font-medium leading-relaxed">
                    {ex}
                  </li>
                ))}
              </ul>
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

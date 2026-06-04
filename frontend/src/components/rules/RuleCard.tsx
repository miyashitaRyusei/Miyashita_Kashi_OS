import type { LyricRule } from "@/types";
import Badge from "@/components/ui/Badge";
import { Quote } from "lucide-react";

interface RuleCardProps {
  rule: LyricRule;
}

export default function RuleCard({ rule }: RuleCardProps) {
  return (
    <div className="border border-[#e9e9e7] rounded-lg bg-white overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="p-4 border-b border-[#e9e9e7] bg-[#fbfbfa] flex items-start justify-between gap-3">
        <h3 className="font-bold text-[#37352f] text-[15px] leading-tight">
          {rule.rule_name}
        </h3>
        {rule.is_novel && (
          <Badge variant="new" className="flex-shrink-0">
            ✨ NEW
          </Badge>
        )}
      </div>
      
      <div className="p-4 flex-1 flex flex-col">

        
        <div className="mt-auto">
          <h4 className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-2">
            根拠フレーズ
          </h4>
          {rule.examples && rule.examples.length > 0 ? (
            <div className="bg-[#f7f7f5] rounded-md p-3 border border-[#e9e9e7] relative">
              <Quote size={12} className="text-[#d4d4d2] absolute top-2 left-2" />
              <ul className="pl-4 space-y-1">
                {rule.examples.map((ex, i) => (
                  <li key={i} className="text-[12px] text-[#37352f] font-medium">
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

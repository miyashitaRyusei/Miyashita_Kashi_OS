import type { LyricRule } from "@/types";
import RuleCard from "./RuleCard";

interface RuleGalleryProps {
  rules: LyricRule[];
  onRemove?: (id: string) => void;
}

export default function RuleGallery({ rules, onRemove }: RuleGalleryProps) {
  if (!rules || rules.length === 0) {
    return (
      <div className="py-20 text-center text-[#9ca3af] text-[13px]">
        作詞ルールがまだありません。
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {rules.map((rule) => (
        <RuleCard 
          key={rule.id} 
          rule={rule} 
          onRemove={() => onRemove && onRemove(rule.id)}
        />
      ))}
    </div>
  );
}

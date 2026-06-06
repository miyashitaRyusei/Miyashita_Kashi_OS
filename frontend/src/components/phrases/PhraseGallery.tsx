import type { LyricPhrase } from "@/types";
import PhraseCard from "./PhraseCard";

interface PhraseGalleryProps {
  phrases: LyricPhrase[];
  onRemove?: (id: string) => void;
}

export default function PhraseGallery({ phrases, onRemove }: PhraseGalleryProps) {
  if (!phrases || phrases.length === 0) {
    return (
      <div className="py-20 text-center text-[#9ca3af] text-[13px]">
        フレーズがまだありません。
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {phrases.map((phrase) => (
        <PhraseCard 
          key={phrase.id} 
          phrase={phrase} 
          onRemove={() => onRemove && onRemove(phrase.id)}
        />
      ))}
    </div>
  );
}

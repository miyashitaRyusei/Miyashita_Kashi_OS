export interface EndingCategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onSelect: (category: string) => void;
}

export default function EndingCategoryTabs({ categories, activeCategory, onSelect }: EndingCategoryTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#e9e9e7]">
      <button
        onClick={() => onSelect("")}
        className={`px-3 py-1.5 text-[13px] rounded-md transition-colors whitespace-nowrap ${
          activeCategory === ""
            ? "bg-[#37352f] text-white font-medium"
            : "text-[#787774] hover:bg-[#fbfbfa]"
        }`}
      >
        すべて
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
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
  );
}

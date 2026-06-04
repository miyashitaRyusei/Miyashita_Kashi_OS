export default function LoadingSpinner({ size = "md", text = "読み込み中..." }: { size?: "sm" | "md" | "lg", text?: string }) {
  const sizeMap = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-[3px]"
  };
  
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeMap[size]} border-[#d4d4d2] border-t-[#37352f] rounded-full animate-spin`} />
      {text && <span className="text-[13px] text-[#9ca3af]">{text}</span>}
    </div>
  );
}

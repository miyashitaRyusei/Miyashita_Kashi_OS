import type { LyricRule } from "@/types";
import { Quote, Tag, ChevronDown, ChevronUp, Heart, Trash2, PenLine, Save, StickyNote } from "lucide-react";
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
  const [memo, setMemo] = useState(rule.memo || "");
  const [isEditingMemo, setIsEditingMemo] = useState(false);

  const handleFavorite = async () => {
    const nextVal = !isFavorite;
    setIsFavorite(nextVal);
    try {
      await updateDictionaryPreference('rule', rule.rule_name, nextVal, false, memo);
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

  const handleSaveMemo = async () => {
    try {
      await updateDictionaryPreference('rule', rule.rule_name, isFavorite, false, memo);
      setIsEditingMemo(false);
    } catch (e) {
      console.error(e);
      alert("メモの保存に失敗しました");
    }
  };

  const tagStyle = rule.tag && TAG_STYLES[rule.tag] ? TAG_STYLES[rule.tag] : TAG_STYLES['その他'];
  const hasMemo = !!memo && !isEditingMemo;
  const cardBorderClass = hasMemo ? "border-yellow-300 shadow-sm" : "border-[#e9e9e7]";

  return (
    <div className={`border rounded-lg bg-white overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full ${cardBorderClass}`}>
      <div className="p-4 border-b border-[#e9e9e7] bg-[#fbfbfa] flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap flex-shrink-0 ${tagStyle}`}>
            <Tag size={10} />
            {rule.tag || '未分類'}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
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
        
        {/* メモエリア */}
        <div className={`p-3 rounded-md border ${memo ? 'bg-yellow-50/50 border-yellow-200' : 'bg-[#fbfbfa] border-[#e9e9e7] border-dashed cursor-pointer hover:bg-gray-50 transition-colors'}`} onClick={() => !isEditingMemo && !memo && setIsEditingMemo(true)}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-bold flex items-center gap-1 ${memo ? 'text-yellow-600' : 'text-[#9ca3af]'}`}>
              <StickyNote size={12} />自分用メモ
            </span>
            {!isEditingMemo && (
              <button onClick={(e) => { e.stopPropagation(); setIsEditingMemo(true); }} className="text-[#9ca3af] hover:text-yellow-600 transition-colors">
                <PenLine size={12} />
              </button>
            )}
          </div>
          {isEditingMemo ? (
            <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="例: 次にバラードを書くときに意識してみる！"
                className="w-full text-[12px] p-2 border border-yellow-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-400 bg-white resize-none text-[#37352f]"
                rows={3}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setMemo(rule.memo || ""); setIsEditingMemo(false); }} className="px-3 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-100 rounded">キャンセル</button>
                <button onClick={handleSaveMemo} className="px-3 py-1 text-[11px] font-bold text-white bg-yellow-500 hover:bg-yellow-600 rounded flex items-center gap-1">
                  <Save size={12} /> 保存
                </button>
              </div>
            </div>
          ) : (
            <div>
              {memo ? (
                <p className="text-[12px] text-[#37352f] whitespace-pre-wrap leading-relaxed">{memo}</p>
              ) : (
                <p className="text-[12px] text-[#c4c4c2] italic">クリックしてメモを追加...</p>
              )}
            </div>
          )}
        </div>
        
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

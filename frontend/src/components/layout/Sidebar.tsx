"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Database,
  PenLine,
  BookType,
  BookOpen,
  Settings,
  Menu,
  X,
  Feather,
  Sprout,
} from "lucide-react";

// ============================================
// ナビゲーション定義
// ============================================

const NAV_ITEMS = [
  { href: "/", label: "楽曲データベース", icon: Database },
  { href: "/editor", label: "楽曲登録エディタ", icon: PenLine },
  { href: "/endings", label: "文末表現辞書", icon: BookType },
  { href: "/phrases", label: "フレーズ辞書", icon: BookType },
  { href: "/rules", label: "作詞ルールブック", icon: BookOpen },
  { href: "/writing", label: "作詞草案エディタ", icon: Feather },
  { href: "/ideas", label: "アイデアの種", icon: Sprout },
] as const;

// ============================================
// Sidebar コンポーネント
// ============================================

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  /** パスがアクティブかどうかを判定する */
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* モバイル用ヘッダー */}
      <div className="md:hidden flex items-center justify-between p-3 border-b border-[#e9e9e7] bg-[#fbfbfa]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-md text-[11px] flex items-center justify-center font-bold shadow-sm">
            M
          </div>
          <div className="font-semibold text-[15px] tracking-wide text-[#37352f]">
            みやした歌詞OS
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 text-[#787774] hover:bg-[#efefed] rounded-md transition-colors"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* サイドバー本体 */}
      <aside className={`
        ${isOpen ? 'flex' : 'hidden'} 
        md:flex
        w-full md:w-64 bg-[#f6faf6] border-b md:border-b-0 md:border-r border-[#e9e9e7] flex-col flex-shrink-0
        absolute md:relative top-[53px] md:top-0 z-50 h-[calc(100vh-53px)] md:h-full
      `}>
        {/* ワークスペースタイトル (PC用) */}
        <div className="hidden md:flex px-6 py-5 items-center gap-2.5 cursor-default">
          <Feather size={20} className="text-emerald-500" />
          <div className="font-bold text-[16px] tracking-wide text-[#37352f] leading-tight">
            みやした歌詞OS
          </div>
        </div>

        {/* セクションラベル */}
        <div className="px-6 py-2 mt-2 md:mt-0 text-[10px] font-bold text-[#c4c4c2] tracking-widest uppercase">
          MENU
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto mt-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)} // モバイルでリンクタップ時に閉じる
                className={`
                  w-full flex items-center gap-3.5 px-4 py-3 text-[14px] rounded-lg
                  transition-all duration-100 font-medium tracking-wide
                  ${
                    active
                      ? "bg-emerald-100/60 text-emerald-900 shadow-sm"
                      : "text-[#787774] hover:bg-emerald-50/80 hover:text-[#37352f]"
                  }
                `}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.5 : 2}
                  className={active ? "text-emerald-600" : "text-[#9ca3af]"}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

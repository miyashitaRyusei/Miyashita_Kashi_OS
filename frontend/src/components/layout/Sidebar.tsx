"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Database,
  PenLine,
  BookType,
  BookOpen,
  Settings,
} from "lucide-react";

// ============================================
// ナビゲーション定義
// ============================================

const NAV_ITEMS = [
  { href: "/", label: "楽曲データベース", icon: Database },
  { href: "/editor", label: "作詞エディタ", icon: PenLine },
  { href: "/endings", label: "文末表現辞書", icon: BookType },
  { href: "/phrases", label: "フレーズ辞典", icon: BookType },
  { href: "/rules", label: "作詞ルールブック", icon: BookOpen },
] as const;

// ============================================
// Sidebar コンポーネント
// ============================================

export default function Sidebar() {
  const pathname = usePathname();

  /** パスがアクティブかどうかを判定する */
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-60 bg-[#fbfbfa] border-r border-[#e9e9e7] flex flex-col flex-shrink-0">
      {/* ワークスペースタイトル */}
      <div className="p-4 flex items-center gap-2.5 hover:bg-[#efefed] cursor-default transition-colors m-2 rounded-md">
        <div className="w-6 h-6 bg-gradient-to-br from-[#37352f] to-[#787774] text-white rounded-md text-[11px] flex items-center justify-center font-bold shadow-sm">
          M
        </div>
        <div>
          <div className="font-semibold text-[13px] text-[#37352f] leading-tight">
            みやした歌詞OS
          </div>
          <div className="text-[10px] text-[#9ca3af] leading-tight">
            作詞支援システム
          </div>
        </div>
      </div>

      {/* セクションラベル */}
      <div className="px-4 py-1.5 text-[11px] font-semibold text-[#9ca3af] tracking-wide uppercase">
        Workspace
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] rounded-md
                transition-all duration-100
                ${
                  active
                    ? "bg-[#efefed] font-medium text-[#37352f]"
                    : "text-[#787774] hover:bg-[#efefed] hover:text-[#37352f]"
                }
              `}
            >
              <Icon
                size={16}
                strokeWidth={active ? 2 : 1.5}
                className={
                  active ? "text-[#37352f]" : "text-[#9ca3af]"
                }
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* フッター */}
      <div className="p-3 border-t border-[#e9e9e7]">
        <button className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#9ca3af] hover:text-[#787774] hover:bg-[#efefed] rounded-md transition-colors">
          <Settings size={14} />
          設定・API連携
        </button>
      </div>
    </aside>
  );
}

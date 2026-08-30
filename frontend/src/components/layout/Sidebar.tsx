"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, BookOpen, BookType, Database, Feather, Menu, PenLine, Sprout, X } from "lucide-react";

const PRIMARY_ITEMS = [
  { href: "/library", label: "ライブラリ", icon: Database },
  { href: "/techniques", label: "作詞技法", icon: BookOpen },
  { href: "/endings", label: "文末表現", icon: BookType },
  { href: "/phrases", label: "フレーズ", icon: BookType },
] as const;

const SUPPORT_ITEMS = [
  { href: "/writing", label: "草案", icon: Feather },
  { href: "/ideas", label: "アイデア", icon: Sprout },
  { href: "/editor", label: "楽曲登録", icon: PenLine },
  { href: "/songs", label: "旧比較画面", icon: Archive },
  { href: "/rules", label: "旧作詞ルール", icon: BookOpen },
] as const;

const MOBILE_ITEMS = [PRIMARY_ITEMS[0], PRIMARY_ITEMS[1], PRIMARY_ITEMS[2], SUPPORT_ITEMS[0]] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  const renderLink = (item: (typeof PRIMARY_ITEMS)[number] | (typeof SUPPORT_ITEMS)[number], compact = false) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} className={`flex w-full items-center gap-3 rounded-lg px-4 ${compact ? "py-2.5 text-[12px]" : "py-3 text-[14px]"} font-medium transition-colors ${active ? "bg-emerald-100/70 text-emerald-900" : "text-[#747d76] hover:bg-emerald-50 hover:text-[#38413a]"}`}><Icon size={compact ? 16 : 18} strokeWidth={active ? 2.5 : 2} className={active ? "text-emerald-600" : "text-[#9aa29c]"} />{item.label}</Link>;
  };

  return <>
    <div className="flex items-center justify-between border-b border-[#e4e9e4] bg-[#f8fbf8] p-3 md:hidden"><Link href="/library" className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white">M</span><span className="text-[14px] font-bold text-[#374039]">みやした歌詞OS</span></Link></div>
    <aside className={`${isOpen ? "flex" : "hidden"} absolute top-[53px] z-50 h-[calc(100vh-53px)] w-full flex-col border-r border-[#e4e9e4] bg-[#f6faf6] md:relative md:top-0 md:flex md:h-full md:w-64`}>
      <Link href="/library" className="hidden items-center gap-2.5 px-6 py-5 md:flex"><Database size={20} className="text-emerald-600" /><span className="text-[16px] font-bold text-[#374039]">みやした歌詞OS</span></Link>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-3"><p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#aab2ac]">Research</p>{PRIMARY_ITEMS.map((item) => renderLink(item))}<p className="px-3 pb-2 pt-6 text-[9px] font-bold uppercase tracking-[0.16em] text-[#aab2ac]">Support</p>{SUPPORT_ITEMS.map((item) => renderLink(item, true))}</nav>
    </aside>
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-[#e4e9e4] bg-[#fbfdfb] px-1 md:hidden">
      {MOBILE_ITEMS.map((item) => { const Icon = item.icon; const active = isActive(item.href); return <Link key={item.href} href={item.href} className={`flex h-full w-full flex-col items-center justify-center gap-1 ${active ? "text-emerald-700" : "text-[#969e98]"}`}><Icon size={20} /><span className="text-[9px] font-bold">{item.label}</span></Link>; })}
      <button onClick={() => setIsOpen((value) => !value)} className={`flex h-full w-full flex-col items-center justify-center gap-1 ${isOpen ? "text-emerald-700" : "text-[#969e98]"}`}>{isOpen ? <X size={20} /> : <Menu size={20} />}<span className="text-[9px] font-bold">メニュー</span></button>
    </div>
  </>;
}

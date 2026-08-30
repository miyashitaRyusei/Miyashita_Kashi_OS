"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, BookOpen, BookType, Database, Feather, GitBranch, Menu, PenLine, Sprout, X } from "lucide-react";

const MAIN = [{ href: "/techniques", label: "作詞技法", icon: BookOpen }, { href: "/constructions", label: "構文・接続", icon: GitBranch }, { href: "/sentence-endings", label: "文末表現", icon: BookType }, { href: "/phrases", label: "フレーズ", icon: BookType }] as const;
const SOURCES = [{ href: "/library", label: "参考楽曲", icon: Database }] as const;
const SUPPORT = [{ href: "/writing", label: "草案", icon: Feather }, { href: "/ideas", label: "アイデア", icon: Sprout }] as const;
const LEGACY = [{ href: "/songs", label: "旧比較・分析", icon: Archive }, { href: "/legacy/sentence-endings", label: "旧文末辞書", icon: BookType }, { href: "/legacy/phrases", label: "旧フレーズ辞書", icon: BookType }, { href: "/rules", label: "旧作詞ルール", icon: BookOpen }, { href: "/editor", label: "楽曲登録", icon: PenLine }] as const;
const MOBILE = [MAIN[0], MAIN[1], MAIN[2], MAIN[3]] as const;

export default function Sidebar() {
  const pathname = usePathname(); const [open, setOpen] = useState(false);
  const render = (item: { href: string; label: string; icon: typeof BookOpen }, compact = false) => { const Icon = item.icon; const active = pathname.startsWith(item.href); return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-lg px-4 ${compact ? "py-2 text-[12px]" : "py-3 text-[14px]"} font-medium ${active ? "bg-emerald-100/70 text-emerald-900" : "text-[#747d76] hover:bg-emerald-50"}`}><Icon size={compact ? 15 : 18} />{item.label}</Link>; };
  return <><div className="flex items-center justify-between border-b bg-[#f8fbf8] p-3 md:hidden"><Link href="/techniques" className="font-bold">みやした歌詞OS</Link></div><aside className={`${open ? "flex" : "hidden"} absolute top-[53px] z-50 h-[calc(100vh-53px)] w-full flex-col border-r bg-[#f6faf6] md:relative md:top-0 md:flex md:h-full md:w-64`}><Link href="/techniques" className="hidden px-6 py-5 text-[16px] font-bold md:block">みやした歌詞OS</Link><nav className="flex-1 overflow-y-auto px-3 pb-20"><Section name="Main">{MAIN.map((x) => render(x))}</Section><Section name="Sources">{SOURCES.map((x) => render(x))}</Section><Section name="Support">{SUPPORT.map((x) => render(x, true))}</Section><Section name="Legacy">{LEGACY.map((x) => render(x, true))}</Section></nav></aside><div className="fixed bottom-0 z-50 flex h-16 w-full border-t bg-white md:hidden">{MOBILE.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className="flex flex-1 flex-col items-center justify-center gap-1 text-[9px]"><Icon size={19}/>{item.label}</Link>; })}<button onClick={() => setOpen(!open)} className="flex flex-1 flex-col items-center justify-center text-[9px]">{open ? <X size={19}/> : <Menu size={19}/>}メニュー</button></div></>;
}
function Section({ name, children }: { name: string; children: ReactNode }) { return <div className="mt-4 space-y-1"><p className="px-3 pb-1 text-[9px] font-bold uppercase tracking-[.16em] text-[#aab2ac]">{name}</p>{children}</div>; }

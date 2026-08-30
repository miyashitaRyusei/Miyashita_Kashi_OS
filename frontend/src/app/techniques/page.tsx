"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { fetchResearchItems } from "@/lib/api";
import type { ResearchItem } from "@/types/research";
import { useResearchAdminToken } from "@/hooks/useResearchAdminToken";
import ResearchAdminTokenPrompt from "@/components/research/ResearchAdminTokenPrompt";

export default function TechniquesPage() {
  const { token, ready, saveToken, clearToken } = useResearchAdminToken();
  const [result, setResult] = useState<{ token: string; items: ResearchItem[]; loading: boolean; unavailable: boolean }>({ token: "", items: [], loading: true, unavailable: false });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const currentResult = result.token === token
    ? result
    : { token, items: [], loading: Boolean(token), unavailable: false };
  const { items, loading, unavailable } = currentResult;

  useEffect(() => {
    if (!ready) return;
    if (!token) return;
    fetchResearchItems({ itemType: "technique" }, token)
      .then((items) => setResult({ token, items, loading: false, unavailable: false }))
      .catch(() => setResult({ token, items: [], loading: false, unavailable: true }));
  }, [ready, token]);

  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category).filter(Boolean) as string[])).sort(), [items]);
  const filtered = useMemo(() => items.filter((item) => {
    const needle = query.trim().toLowerCase();
    const matchesText = !needle || `${item.title} ${item.content} ${item.reuse_hint ?? ""} ${item.tags.join(" ")}`.toLowerCase().includes(needle);
    return matchesText && (category === "all" || item.category === category);
  }), [category, items, query]);

  return <div className="flex-1 overflow-y-auto bg-[#fafcfa]"><div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
    {ready && !token && <div className="mb-5"><ResearchAdminTokenPrompt onSubmit={saveToken} /></div>}
    {ready && token && <div className="mb-3 text-right"><button onClick={clearToken} className="text-[10px] font-bold text-[#7b847d] hover:text-amber-700">研究トークンを解除</button></div>}
    <header className="mb-7"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Research Index</p><h1 className="mt-1 text-2xl font-bold text-[#333b35]">作詞技法</h1><p className="mt-2 text-[12px] text-[#7c857e]">楽曲ごとの研究分析から、書き方の原理を横断検索します。</p></header>
    <div className="mb-5 flex gap-2 rounded-lg border border-[#e1e7e1] bg-white p-3"><label className="flex flex-1 items-center gap-2 rounded-md border border-[#dfe5df] px-3 py-2"><Search size={14} className="text-[#9ba39d]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="技法・転用ヒント・タグを検索" className="w-full bg-transparent text-[12px] outline-none" /></label><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-md border border-[#dfe5df] bg-white px-3 text-[11px]"><option value="all">全カテゴリ</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></div>
    {loading ? <p className="py-20 text-center text-[12px] text-[#8b948d]">読み込み中...</p> : unavailable ? <Empty title="migration適用後に利用できます" description="既存の作詞ルールは引き続き利用できます。" link="/rules" linkLabel="旧作詞ルールを見る" /> : filtered.length === 0 ? <Empty title="該当する技法はありません" description="楽曲詳細からChatGPT研究分析を取り込むと、ここへ自動展開されます。" /> : <div className="grid gap-3 md:grid-cols-2">{filtered.map((item) => <Link key={item.id} href={`/songs/${item.song_id}`} className="rounded-lg border border-[#e1e7e1] bg-white p-4 hover:border-emerald-300"><div className="flex items-start justify-between gap-3"><h2 className="text-[13px] font-bold text-[#3d4740]">{item.title}</h2>{item.category && <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">{item.category}</span>}</div>{item.content && <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-[#69726b]">{item.content}</p>}{item.reuse_hint && <p className="mt-3 border-l-2 border-emerald-200 pl-2 text-[10px] leading-relaxed text-[#536158]"><strong>転用:</strong> {item.reuse_hint}</p>}</Link>)}</div>}
  </div></div>;
}

function Empty({ title, description, link, linkLabel }: { title: string; description: string; link?: string; linkLabel?: string }) {
  return <div className="rounded-lg border border-dashed border-[#dce4dc] bg-white px-6 py-16 text-center"><BookOpen size={24} className="mx-auto text-emerald-300" /><p className="mt-3 text-[13px] font-bold text-[#59625b]">{title}</p><p className="mt-1 text-[11px] text-[#929a94]">{description}</p>{link && <Link href={link} className="mt-4 inline-block text-[11px] font-bold text-emerald-700">{linkLabel}</Link>}</div>;
}

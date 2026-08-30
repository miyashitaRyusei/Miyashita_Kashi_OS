"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { fetchResearchItems } from "@/lib/api";
import type { ResearchItem, ResearchItemType } from "@/types/research";
import { useResearchAdminToken } from "@/hooks/useResearchAdminToken";
import ResearchAdminTokenPrompt from "./ResearchAdminTokenPrompt";

type Props = { title: string; description: string; itemTypes: ResearchItemType[]; categoryLabel?: string };

export default function ResearchDictionaryPage({ title, description, itemTypes, categoryLabel = "種類" }: Props) {
  const { token, ready, saveToken, clearToken } = useResearchAdminToken();
  const [songId] = useState<string | undefined>(() =>
    typeof window === "undefined"
      ? undefined
      : new URLSearchParams(window.location.search).get("song_id") ?? undefined
  );
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [artist, setArtist] = useState("all");

  useEffect(() => {
    if (!ready || !token) return;
    Promise.all(itemTypes.map((itemType) => fetchResearchItems({ itemType, songId }, token)))
      .then((groups) => setItems(groups.flat()))
      .finally(() => setLoading(false));
  }, [itemTypes, ready, songId, token]);

  const categories = useMemo(() => [...new Set(items.map((item) => item.category).filter(Boolean) as string[])].sort(), [items]);
  const artists = useMemo(() => [...new Set(items.map((item) => item.song_artist).filter(Boolean) as string[])].sort(), [items]);
  const filtered = useMemo(() => items.filter((item) => {
    const needle = query.trim().toLowerCase();
    const text = `${item.title} ${item.content} ${item.effect ?? ""} ${item.reuse_hint ?? ""} ${item.song_title ?? ""} ${item.song_artist ?? ""} ${item.tags.join(" ")}`.toLowerCase();
    return (!needle || text.includes(needle)) && (category === "all" || item.category === category) && (artist === "all" || item.song_artist === artist);
  }), [artist, category, items, query]);

  return <div className="flex-1 overflow-y-auto bg-[#fafcfa]"><div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
    {ready && !token && <ResearchAdminTokenPrompt onSubmit={saveToken} />}
    {ready && token && <div className="mb-3 text-right"><button onClick={clearToken} className="text-[10px] font-bold text-[#7b847d]">研究トークンを解除</button></div>}
    <header className="mb-7"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Writing Dictionary</p><h1 className="mt-1 text-2xl font-bold text-[#333b35]">{title}</h1><p className="mt-2 text-[12px] text-[#7c857e]">{description}</p>{songId && <Link href="/library" className="mt-2 inline-block text-[10px] font-bold text-emerald-700">楽曲フィルターを解除</Link>}</header>
    <div className="mb-5 grid gap-2 rounded-lg border border-[#e1e7e1] bg-white p-3 md:grid-cols-[1fr_180px_180px]">
      <label className="flex items-center gap-2 rounded-md border border-[#dfe5df] px-3 py-2"><Search size={14} className="text-[#9ba39d]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="言葉・効果・転用法を検索" className="w-full bg-transparent text-[12px] outline-none" /></label>
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-[#dfe5df] bg-white px-3 text-[11px]"><option value="all">{categoryLabel}: すべて</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>
      <select value={artist} onChange={(e) => setArtist(e.target.value)} className="rounded-md border border-[#dfe5df] bg-white px-3 text-[11px]"><option value="all">Artist: すべて</option>{artists.map((value) => <option key={value}>{value}</option>)}</select>
    </div>
    {!token ? <Empty text="管理トークンを設定すると、activeな研究分析から抽出した辞典を表示します。" /> : loading ? <p className="py-20 text-center text-[12px] text-[#8b948d]">読み込み中...</p> : filtered.length === 0 ? <Empty text="条件に一致する研究項目はありません。該当しないカテゴリは0件で構いません。" /> : <div className="grid gap-3 md:grid-cols-2">{filtered.map((item) => <details key={item.id} className="rounded-lg border border-[#e1e7e1] bg-white p-4 open:border-emerald-300"><summary className="cursor-pointer list-none"><div className="flex items-start justify-between gap-3"><h2 className="text-[13px] font-bold text-[#3d4740]">{item.title}</h2>{item.category && <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">{item.category}</span>}</div><p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-[#69726b]">{item.content}</p>{item.reuse_hint && <p className="mt-3 border-l-2 border-emerald-200 pl-2 text-[10px] text-[#536158]"><strong>自作へ:</strong> {item.reuse_hint}</p>}<p className="mt-3 text-[10px] font-medium text-[#8a938c]">{item.song_title ?? "元楽曲"} · {item.song_artist ?? ""}</p></summary><div className="mt-4 space-y-3 border-t border-[#edf0ed] pt-3 text-[11px] leading-relaxed text-[#626c64]">{item.effect && <p><strong>効果:</strong> {item.effect}</p>}{item.examples.length > 0 && <div><strong>Evidence</strong>{item.examples.map((example, index) => <blockquote key={index} className="mt-1 border-l-2 border-[#dce4dc] pl-2">{String(example.quote ?? example.text ?? "")}{example.section ? `（${String(example.section)}）` : ""}{example.explanation ? <span className="block text-[#89918b]">{String(example.explanation)}</span> : null}</blockquote>)}</div>}{item.tags.length > 0 && <p className="text-[10px] text-[#8a938c]">{item.tags.map((tag) => `#${tag}`).join(" ")}</p>}<Link href={`/songs/${item.song_id}`} className="inline-block font-bold text-emerald-700">元楽曲を確認</Link></div></details>)}</div>}
  </div></div>;
}

function Empty({ text }: { text: string }) { return <div className="rounded-lg border border-dashed border-[#dce4dc] bg-white px-6 py-16 text-center"><BookOpen size={24} className="mx-auto text-emerald-300" /><p className="mt-3 text-[12px] text-[#7d867f]">{text}</p></div>; }

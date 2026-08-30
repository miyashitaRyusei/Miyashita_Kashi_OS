"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, BookOpen, Heart, Search } from "lucide-react";
import type { Song } from "@/types";
import type { ReferenceTier, SongResearchAnalysis } from "@/types/research";
import { fetchActiveResearchAnalysis, fetchSongs, updateSongReferenceTier } from "@/lib/api";
import { useResearchAdminToken } from "@/hooks/useResearchAdminToken";
import ResearchAdminTokenPrompt from "@/components/research/ResearchAdminTokenPrompt";

const TIER_LABELS: Record<ReferenceTier, string> = { core: "Core", selected: "Selected", archive: "Archive" };

export default function LibraryPage() {
  const { token, ready, saveToken, clearToken } = useResearchAdminToken();
  const [songs, setSongs] = useState<Song[]>([]);
  const [analysisState, setAnalysisState] = useState<{ token: string; values: Record<string, SongResearchAnalysis | null> }>({ token: "", values: {} });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [includeArchive, setIncludeArchive] = useState(false);
  const [includeUnclassified, setIncludeUnclassified] = useState(false);

  useEffect(() => { fetchSongs().then(setSongs).finally(() => setLoading(false)); }, []);
  const analyses = useMemo(
    () => analysisState.token === token ? analysisState.values : {},
    [analysisState, token],
  );

  const visibleSongs = useMemo(() => songs.filter((song) => {
    const tierVisible = song.reference_tier === "core" || song.reference_tier === "selected" || (includeArchive && song.reference_tier === "archive") || (includeUnclassified && !song.reference_tier);
    const needle = query.trim().toLowerCase();
    return tierVisible && (!needle || `${song.title} ${song.artist}`.toLowerCase().includes(needle));
  }), [includeArchive, includeUnclassified, query, songs]);

  useEffect(() => {
    if (!ready || !token) return;
    const missing = visibleSongs.filter((song) => !(song.id in analyses));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map(async (song) => {
      try { return [song.id, await fetchActiveResearchAnalysis(song.id, token)] as const; }
      catch { return [song.id, null] as const; }
    })).then((entries) => {
      if (!cancelled) {
        setAnalysisState((current) => ({
          token,
          values: {
            ...(current.token === token ? current.values : {}),
            ...Object.fromEntries(entries),
          },
        }));
      }
    });
    return () => { cancelled = true; };
  }, [analyses, ready, token, visibleSongs]);

  const changeTier = async (song: Song, tier: ReferenceTier | null) => {
    try {
      const updated = await updateSongReferenceTier(song.id, tier);
      setSongs((current) => current.map((item) => item.id === song.id ? updated : item));
    } catch { alert("reference_tier用migrationの適用後に変更できます。"); }
  };

  return <div className="flex-1 overflow-y-auto bg-[#fafcfa]"><div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
    {ready && !token && <div className="mb-5"><ResearchAdminTokenPrompt onSubmit={saveToken} /></div>}
    {ready && token && <div className="mb-3 text-right"><button onClick={clearToken} className="text-[10px] font-bold text-[#7b847d] hover:text-amber-700">研究トークンを解除</button></div>}
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Lyric Research</p><h1 className="mt-1 text-2xl font-bold text-[#333b35]">歌詞ライブラリ</h1><p className="mt-2 text-[12px] text-[#7c857e]">好きな書き方を、曲から技法・表現・モチーフへ育てる研究棚</p></div><Link href="/editor" className="rounded-md bg-emerald-700 px-4 py-2 text-[11px] font-bold text-white hover:bg-emerald-800">楽曲を登録</Link></header>
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-[#e1e7e1] bg-white p-3">
      <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-md border border-[#dfe5df] px-3 py-2"><Search size={14} className="text-[#9ba39d]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="タイトル・アーティストを検索" className="w-full bg-transparent text-[12px] outline-none" /></label>
      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[#dfe5df] px-3 py-2 text-[11px] text-[#687069]"><input type="checkbox" checked={includeArchive} onChange={(event) => setIncludeArchive(event.target.checked)} className="accent-emerald-700" />Archiveを含む</label>
      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[#dfe5df] px-3 py-2 text-[11px] text-[#687069]"><input type="checkbox" checked={includeUnclassified} onChange={(event) => setIncludeUnclassified(event.target.checked)} className="accent-emerald-700" />未分類を含む</label>
      <Link href="/songs" className="px-2 text-[11px] font-bold text-[#7b847d] hover:text-emerald-700">旧比較画面</Link>
    </div>
    {loading ? <p className="py-20 text-center text-[12px] text-[#8b948d]">ライブラリを読み込み中...</p> : visibleSongs.length > 0 ? <div className="overflow-hidden rounded-lg border border-[#e1e7e1] bg-white">{visibleSongs.map((song) => {
      const analysis = token ? analyses[song.id]?.analysis_json : undefined;
      const categories = Array.from(new Set(analysis?.techniques.map((item) => item.category) ?? [])).slice(0, 4);
      return <article key={song.id} className="grid gap-3 border-b border-[#edf0ed] px-4 py-4 last:border-0 hover:bg-[#fbfdfb] md:grid-cols-[minmax(180px,1.1fr)_120px_1.8fr_auto] md:items-center">
        <Link href={`/songs/${song.id}`} className="min-w-0"><p className="truncate text-[13px] font-bold text-[#374039]">{song.title}</p><p className="mt-1 truncate text-[11px] text-[#858e87]">{song.artist}</p></Link>
        <select value={song.reference_tier ?? ""} onChange={(event) => changeTier(song, (event.target.value || null) as ReferenceTier | null)} className="rounded-md border border-[#dfe5df] bg-white px-2 py-1.5 text-[10px] text-[#657068] outline-none"><option value="">未分類</option>{Object.entries(TIER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <Link href={`/songs/${song.id}`} className="min-w-0">{analysis ? <><p className="line-clamp-2 text-[11px] leading-relaxed text-[#5e6861]">{analysis.summary.overview || "概要なし"}</p>{categories.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{categories.map((category) => <span key={category} className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">{category}</span>)}</div>}</> : <span className="inline-flex items-center gap-1.5 text-[10px] text-[#a0a7a1]"><BookOpen size={12} />ChatGPT研究分析なし</span>}</Link>
        <div className="flex items-center gap-2 text-[#a0a7a1]">{song.is_liked && <Heart size={14} fill="currentColor" className="text-rose-400" />}{song.reference_tier === "archive" && <Archive size={14} />}</div>
      </article>;
    })}</div> : <div className="rounded-lg border border-dashed border-[#dce4dc] bg-white px-6 py-16 text-center"><BookOpen size={24} className="mx-auto text-emerald-300" /><p className="mt-3 text-[13px] font-bold text-[#59625b]">通常表示にはCore / Selectedの曲が並びます</p><p className="mt-1 text-[11px] text-[#929a94]">migration適用後に曲単位で分類できます。既存曲を確認する場合は「未分類を含む」を選んでください。</p></div>}
  </div></div>;
}

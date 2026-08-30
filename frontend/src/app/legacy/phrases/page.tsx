"use client";
import { useEffect, useState } from "react";
import { fetchLyricPhrases } from "@/lib/api";
import type { LyricPhrase } from "@/types";
export default function LegacyPhrasesPage() {
  const [items, setItems] = useState<LyricPhrase[]>([]);
  useEffect(() => { fetchLyricPhrases().then(setItems); }, []);
  return <div className="flex-1 overflow-y-auto p-8"><div className="mx-auto max-w-5xl"><h1 className="text-2xl font-bold">旧フレーズ辞書</h1><p className="mt-2 text-sm text-gray-500">既存lyric_phrasesデータを保持したLegacy表示です。</p><div className="mt-6 grid gap-3 md:grid-cols-2">{items.map((item) => <div key={item.id} className="rounded-lg border bg-white p-4"><p className="font-bold">{item.text}</p><p className="mt-2 text-xs text-gray-500">{item.category}</p></div>)}</div></div></div>;
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Feather,
  FileMusic,
  Lightbulb,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { IdeaSeed, LyricDraft, LyricPhrase, LyricRule, SentenceEnding, Song } from "@/types";
import {
  createDraft,
  deleteDraft,
  fetchDrafts,
  fetchIdeaSeeds,
  fetchLyricPhrases,
  fetchLyricRules,
  fetchSentenceEndings,
  fetchSongs,
  updateDraft,
} from "@/lib/api";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type MaterialTab = "materials" | "rules" | "endings" | "songs";
type MobilePane = "drafts" | "editor" | "materials";
type RuleWithSource = LyricRule & { song_id?: string };

const SECTION_MARKS = ["[1A]", "[1B]", "[サビ]", "[2A]", "[D]", "[落ちサビ]", "[大サビ]"];

const MATERIAL_TABS: { key: MaterialTab; label: string }[] = [
  { key: "materials", label: "素材" },
  { key: "rules", label: "技法" },
  { key: "endings", label: "文末" },
  { key: "songs", label: "参考曲" },
];

export default function WritingWorkspacePage() {
  const pathname = usePathname();
  const router = useRouter();
  const [drafts, setDrafts] = useState<LyricDraft[]>([]);
  const [activeDraft, setActiveDraft] = useState<LyricDraft | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "editing" | "error">("saved");

  useEffect(() => {
    if (pathname === "/") router.replace("/library");
  }, [pathname, router]);

  const [ideas, setIdeas] = useState<IdeaSeed[]>([]);
  const [phrases, setPhrases] = useState<LyricPhrase[]>([]);
  const [rules, setRules] = useState<RuleWithSource[]>([]);
  const [likedRuleIds, setLikedRuleIds] = useState<Set<string>>(new Set());
  const [endings, setEndings] = useState<SentenceEnding[]>([]);
  const [likedEndingTexts, setLikedEndingTexts] = useState<Set<string>>(new Set());
  const [songs, setSongs] = useState<Song[]>([]);

  const [activeTab, setActiveTab] = useState<MaterialTab>("materials");
  const [mobilePane, setMobilePane] = useState<MobilePane>("editor");
  const [endingSearch, setEndingSearch] = useState("");
  const [endingCategory, setEndingCategory] = useState("すべて");
  const [favoriteEndingsOnly, setFavoriteEndingsOnly] = useState(false);
  const [likedEndingsOnly, setLikedEndingsOnly] = useState(false);
  const [copiedEnding, setCopiedEnding] = useState<string | null>(null);

  useEffect(() => {
    async function loadWorkspace() {
      setLoading(true);
      try {
        const [
          draftsData,
          phrasesData,
          rulesData,
          likedRulesData,
          endingsData,
          likedEndingsData,
          ideasData,
          songsData,
        ] = await Promise.all([
          fetchDrafts(),
          fetchLyricPhrases(),
          fetchLyricRules(),
          fetchLyricRules(true),
          fetchSentenceEndings(),
          fetchSentenceEndings(undefined, true),
          fetchIdeaSeeds(),
          fetchSongs(),
        ]);

        setDrafts(draftsData);
        setPhrases(phrasesData.filter((phrase) => phrase.is_favorite));
        setRules(rulesData as RuleWithSource[]);
        setLikedRuleIds(new Set(likedRulesData.map((rule) => rule.id)));
        setEndings(endingsData);
        setLikedEndingTexts(new Set(likedEndingsData.map((ending) => ending.ending_text)));
        setIdeas(ideasData);
        setSongs(songsData);

        if (draftsData.length > 0) {
          const firstDraft = draftsData[0];
          setActiveDraft(firstDraft);
          setTitle(firstDraft.title);
          setContent(firstDraft.content);
        }
      } catch (error) {
        console.error("作詞ワークスペースの読み込みに失敗しました", error);
      } finally {
        setLoading(false);
      }
    }

    void loadWorkspace();
  }, []);

  useEffect(() => {
    if (!activeDraft) return;
    if (activeDraft.title === title && activeDraft.content === content) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const updated = await updateDraft(activeDraft.id, title, content);
        setDrafts((current) => current.map((draft) => draft.id === updated.id ? updated : draft));
        setActiveDraft(updated);
        setSaveState("saved");
      } catch (error) {
        console.error("オートセーブに失敗しました", error);
        setSaveState("error");
      }
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [activeDraft, content, title]);

  const songMap = useMemo(() => new Map(songs.map((song) => [song.id, song])), [songs]);

  const sortedRules = useMemo(() => {
    return [...rules].sort((a, b) => {
      const priority = (rule: LyricRule) => rule.is_favorite ? 0 : likedRuleIds.has(rule.id) ? 1 : 2;
      return priority(a) - priority(b);
    });
  }, [likedRuleIds, rules]);

  const endingCategories = useMemo(() => {
    return ["すべて", ...Array.from(new Set(endings.map((ending) => ending.category).filter(Boolean) as string[]))];
  }, [endings]);

  const filteredEndings = useMemo(() => {
    const query = endingSearch.trim().toLowerCase();
    return endings.filter((ending) => {
      if (query && !ending.ending_text.toLowerCase().includes(query)) return false;
      if (endingCategory !== "すべて" && ending.category !== endingCategory) return false;
      if (favoriteEndingsOnly && !ending.is_favorite) return false;
      if (likedEndingsOnly && !likedEndingTexts.has(ending.ending_text)) return false;
      return true;
    });
  }, [endingCategory, endingSearch, endings, favoriteEndingsOnly, likedEndingTexts, likedEndingsOnly]);

  const sortedSongs = useMemo(() => {
    return [...songs].sort((a, b) => Number(b.is_liked) - Number(a.is_liked));
  }, [songs]);

  const selectDraft = (draft: LyricDraft) => {
    setActiveDraft(draft);
    setTitle(draft.title);
    setContent(draft.content);
    setSaveState("saved");
    setMobilePane("editor");
  };

  const createNewDraft = async () => {
    try {
      const newDraft = await createDraft("無題の草案", "");
      setDrafts((current) => [newDraft, ...current]);
      selectDraft(newDraft);
    } catch {
      alert("草案の作成に失敗しました");
    }
  };

  const saveDraft = async () => {
    if (!activeDraft) return;
    setIsSaving(true);
    try {
      const updated = await updateDraft(activeDraft.id, title, content);
      setDrafts((current) => current.map((draft) => draft.id === updated.id ? updated : draft));
      setActiveDraft(updated);
      setSaveState("saved");
    } catch {
      setSaveState("error");
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const removeDraft = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm("本当にこの草案を削除しますか？")) return;
    try {
      await deleteDraft(id);
      const remaining = drafts.filter((draft) => draft.id !== id);
      setDrafts(remaining);
      if (activeDraft?.id === id) {
        if (remaining[0]) selectDraft(remaining[0]);
        else {
          setActiveDraft(null);
          setTitle("");
          setContent("");
        }
      }
    } catch {
      alert("削除に失敗しました");
    }
  };

  const insertText = (text: string) => {
    if (!activeDraft) return;
    setSaveState("editing");
    setContent((current) => {
      const separator = current.length === 0 || current.endsWith("\n") ? "" : "\n";
      return `${current}${separator}${text}`;
    });
    setMobilePane("editor");
  };

  const insertSection = (mark: string) => {
    if (!activeDraft) return;
    setSaveState("editing");
    setContent((current) => {
      const separator = current === "" || current.endsWith("\n\n") ? "" : current.endsWith("\n") ? "\n" : "\n\n";
      return `${current}${separator}${mark}\n`;
    });
  };

  const copyEnding = async (ending: string) => {
    try {
      await navigator.clipboard.writeText(ending);
      setCopiedEnding(ending);
      window.setTimeout(() => setCopiedEnding(null), 1200);
    } catch {
      alert("コピーに失敗しました");
    }
  };

  const formatDate = (date: string) => {
    const value = new Date(date);
    return `${value.getMonth() + 1}/${value.getDate()} ${value.getHours()}:${pad(value.getMinutes())}`;
  };

  if (pathname === "/") {
    return <div className="flex-1 flex items-center justify-center text-[12px] text-[#8b938d]">ライブラリへ移動中...</div>;
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><LoadingSpinner text="作詞環境を準備中..." /></div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8faf8]">
      <div className="md:hidden flex border-b border-[#e1e7e1] bg-white flex-shrink-0">
        {([
          ["drafts", "草案"],
          ["editor", "書く"],
          ["materials", "作詞素材"],
        ] as [MobilePane, string][]).map(([pane, label]) => (
          <button
            key={pane}
            onClick={() => setMobilePane(pane)}
            className={`flex-1 py-3 text-[12px] font-bold border-b-2 ${mobilePane === pane ? "border-emerald-600 text-emerald-700" : "border-transparent text-[#9ca3af]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex min-h-0">
        <aside className={`${mobilePane === "drafts" ? "flex" : "hidden"} md:flex w-full md:w-60 flex-col flex-shrink-0 border-r border-[#e1e7e1] bg-[#f4f7f4]`}>
          <div className="h-14 px-4 flex items-center justify-between border-b border-[#e1e7e1]">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-emerald-700 uppercase">Drafts</p>
              <h1 className="text-[14px] font-bold text-[#373d37]">草案</h1>
            </div>
            <button onClick={createNewDraft} className="p-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700" aria-label="新しい草案">
              <Plus size={15} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {drafts.map((draft) => (
              <button
                key={draft.id}
                onClick={() => selectDraft(draft)}
                className={`w-full text-left px-3 py-3 rounded-md group mb-1 border ${activeDraft?.id === draft.id ? "bg-white border-emerald-200 shadow-sm" : "border-transparent hover:bg-white"}`}
              >
                <div className="flex gap-2 items-start">
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[13px] font-semibold ${activeDraft?.id === draft.id ? "text-emerald-800" : "text-[#4c524c]"}`}>{draft.title || "無題の草案"}</p>
                    <span className="mt-1.5 flex items-center gap-1 text-[10px] text-[#9ca3af]"><Clock size={10} />{formatDate(draft.updated_at)}</span>
                  </div>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => removeDraft(draft.id, event)}
                    onKeyDown={(event) => { if (event.key === "Enter") removeDraft(draft.id, event as unknown as React.MouseEvent); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#b9bdb9] hover:text-red-500"
                    aria-label={`${draft.title}を削除`}
                  >
                    <Trash2 size={13} />
                  </span>
                </div>
              </button>
            ))}
            {drafts.length === 0 && <p className="px-3 py-8 text-center text-[12px] text-[#9ca3af]">最初の草案を作成してください</p>}
          </div>
        </aside>

        <main className={`${mobilePane === "editor" ? "flex" : "hidden"} md:flex min-w-0 flex-1 flex-col bg-white`}>
          {activeDraft ? (
            <>
              <header className="min-h-14 px-5 flex items-center gap-4 border-b border-[#e8ebe8]">
                <Feather size={17} className="text-emerald-600 flex-shrink-0" />
                <input
                  value={title}
                  onChange={(event) => { setTitle(event.target.value); setSaveState("editing"); }}
                  placeholder="無題の草案"
                  className="min-w-0 flex-1 bg-transparent text-[17px] font-bold text-[#303630] outline-none placeholder:text-[#c2c7c2]"
                />
                <span className={`hidden sm:flex items-center gap-1 text-[10px] ${saveState === "error" ? "text-red-500" : "text-[#9ca3af]"}`}>
                  {saveState === "saved" && <Check size={11} />}
                  {saveState === "editing" ? "未保存の変更" : saveState === "error" ? "保存できませんでした" : "自動保存済み"}
                </span>
                <button onClick={saveDraft} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-[12px] font-bold hover:bg-emerald-700 disabled:opacity-50">
                  <Save size={13} />{isSaving ? "保存中" : "保存"}
                </button>
              </header>
              <div className="px-5 py-2 flex gap-1.5 overflow-x-auto border-b border-[#eef0ee] bg-[#fbfcfb]">
                {SECTION_MARKS.map((mark) => (
                  <button key={mark} onClick={() => insertSection(mark)} className="px-2 py-1 rounded border border-[#dfe5df] bg-white text-[10px] font-bold text-[#727972] hover:border-emerald-300 hover:text-emerald-700 whitespace-nowrap">
                    {mark}
                  </button>
                ))}
              </div>
              <textarea
                value={content}
                onChange={(event) => { setContent(event.target.value); setSaveState("editing"); }}
                placeholder="ここから歌詞を書き始める..."
                spellCheck={false}
                className="flex-1 w-full resize-none px-7 py-7 md:px-10 md:py-9 text-[15px] md:text-[16px] leading-[2] text-[#343a34] outline-none placeholder:text-[#c3c8c3]"
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
              <Feather size={28} className="text-emerald-300" />
              <p className="text-[14px] font-bold text-[#596059]">草案を選ぶか、新しく作成してください</p>
              <button onClick={createNewDraft} className="px-4 py-2 rounded-md bg-emerald-600 text-white text-[12px] font-bold">新しい草案</button>
            </div>
          )}
        </main>

        <aside className={`${mobilePane === "materials" ? "flex" : "hidden"} md:flex w-full md:w-[370px] xl:w-[400px] flex-col flex-shrink-0 border-l border-[#e1e7e1] bg-[#f7f9f7] min-w-0`}>
          <div className="h-14 px-4 flex items-center border-b border-[#e1e7e1] bg-white">
            <Sparkles size={15} className="mr-2 text-emerald-600" />
            <h2 className="text-[13px] font-bold text-[#3f463f]">作詞素材</h2>
          </div>
          <div className="grid grid-cols-4 gap-1 p-2 border-b border-[#e1e7e1] bg-white">
            {MATERIAL_TABS.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`py-2 rounded text-[11px] font-bold ${activeTab === tab.key ? "bg-emerald-50 text-emerald-800" : "text-[#8b918b] hover:bg-[#f3f5f3]"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === "materials" && (
              <div className="p-3 space-y-5">
                <MaterialSection title="アイデアの種" icon={<Lightbulb size={13} />} empty={ideas.length === 0}>
                  {ideas.map((idea) => (
                    <CompactInsertButton key={idea.id} text={idea.content} meta={idea.category} onInsert={() => insertText(idea.content)} />
                  ))}
                </MaterialSection>
                <MaterialSection title="お気に入りフレーズ" icon={<FileMusic size={13} />} empty={phrases.length === 0}>
                  {phrases.map((phrase) => (
                    <CompactInsertButton key={`${phrase.phrase_type}-${phrase.text}`} text={phrase.text} meta={phrase.phrase_type === "start" ? "書き出し" : "書き終わり"} onInsert={() => insertText(phrase.text)} />
                  ))}
                </MaterialSection>
              </div>
            )}

            {activeTab === "rules" && (
              <div className="p-3 space-y-2">
                {sortedRules.map((rule) => {
                  const sourceSong = rule.song_id ? songMap.get(rule.song_id) : undefined;
                  const likedSource = likedRuleIds.has(rule.id);
                  return (
                    <details key={rule.id} className="group rounded-md border border-[#e1e5e1] bg-white open:border-emerald-200">
                      <summary className="list-none cursor-pointer px-3 py-2.5 flex items-start gap-2">
                        <BookOpen size={13} className="mt-0.5 text-emerald-600 flex-shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12px] font-bold text-[#414741] leading-snug">{rule.rule_name}</span>
                          <span className="mt-1 block truncate text-[10px] text-[#9aa09a]">{sourceSong ? `${sourceSong.title} / ${sourceSong.artist}` : likedSource ? "Like曲由来" : "分析曲由来"}</span>
                        </span>
                        {rule.is_favorite && <span className="text-[9px] font-bold text-amber-600">★</span>}
                        <ChevronRight size={13} className="mt-0.5 text-[#b3b8b3] transition-transform group-open:rotate-90" />
                      </summary>
                      <div className="px-3 pb-3 pl-8 space-y-2">
                        {rule.description && <p className="text-[11px] leading-relaxed text-[#6e746e]">{rule.description}</p>}
                        {rule.examples?.[0] && <p className="border-l-2 border-emerald-200 pl-2 text-[11px] text-[#505650]">{rule.examples[0]}</p>}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}

            {activeTab === "endings" && (
              <div className="flex min-h-full flex-col">
                <div className="sticky top-0 z-10 p-3 space-y-2 border-b border-[#e2e6e2] bg-[#f7f9f7]">
                  <label className="flex items-center gap-2 px-2.5 py-2 bg-white border border-[#dfe4df] rounded-md">
                    <Search size={13} className="text-[#9ca3af]" />
                    <input value={endingSearch} onChange={(event) => setEndingSearch(event.target.value)} placeholder="文末を検索" className="w-full bg-transparent outline-none text-[11px]" />
                  </label>
                  <div className="flex gap-2">
                    <select value={endingCategory} onChange={(event) => setEndingCategory(event.target.value)} className="min-w-0 flex-1 p-2 rounded-md border border-[#dfe4df] bg-white text-[10px] text-[#5f665f] outline-none">
                      {endingCategories.map((category) => <option key={category}>{category}</option>)}
                    </select>
                    <FilterToggle active={favoriteEndingsOnly} onClick={() => setFavoriteEndingsOnly((value) => !value)}>お気に入り</FilterToggle>
                    <FilterToggle active={likedEndingsOnly} onClick={() => setLikedEndingsOnly((value) => !value)}>Like曲</FilterToggle>
                  </div>
                </div>
                <div className="p-3 grid grid-cols-2 gap-2">
                  {filteredEndings.map((ending) => (
                    <button key={ending.ending_text} onClick={() => copyEnding(ending.ending_text)} className="min-w-0 px-3 py-2.5 text-left rounded-md border border-[#e1e5e1] bg-white hover:border-emerald-300">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[12px] font-bold text-[#444a44]">{ending.ending_text}</span>
                        {copiedEnding === ending.ending_text ? <Check size={12} className="text-emerald-600" /> : <Copy size={11} className="text-[#b3b8b3]" />}
                      </span>
                      <span className="mt-1 block truncate text-[9px] text-[#9ba19b]">{ending.category || "未分類"}{ending.is_favorite ? " ・ ★" : ""}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "songs" && (
              <div className="p-3 space-y-1.5">
                {sortedSongs.map((song) => (
                  <Link key={song.id} href={`/songs/${song.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-transparent hover:border-[#dfe4df] hover:bg-white">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${song.is_liked ? "bg-red-400" : "bg-[#d4d8d4]"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-bold text-[#444a44]">{song.title}</span>
                      <span className="block truncate text-[10px] text-[#9ba19b]">{song.artist}</span>
                    </span>
                    <ChevronRight size={13} className="text-[#b8bdb8]" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function MaterialSection({ title, icon, empty, children }: { title: string; icon: React.ReactNode; empty: boolean; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#8d938d] uppercase">{icon}{title}</h3>
      <div className="space-y-1.5">
        {empty ? <p className="px-2 py-4 text-center text-[11px] text-[#a4aaa4]">まだありません</p> : children}
      </div>
    </section>
  );
}

function CompactInsertButton({ text, meta, onInsert }: { text: string; meta: string; onInsert: () => void }) {
  return (
    <button onClick={onInsert} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-[#e1e5e1] bg-white text-left hover:border-emerald-300 group">
      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#4b514b]">{text}</span>
      <span className="text-[9px] text-[#a0a6a0]">{meta}</span>
      <Plus size={13} className="text-[#b8bdb8] group-hover:text-emerald-600" />
    </button>
  );
}

function FilterToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`px-2 py-1.5 rounded-md border text-[9px] font-bold whitespace-nowrap ${active ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-[#dfe4df] bg-white text-[#858b85]"}`}>{children}</button>;
}

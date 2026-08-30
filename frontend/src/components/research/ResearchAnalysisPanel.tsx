"use client";

import { useEffect, useState } from "react";
import { BookOpen, Check, Clipboard, Download, X } from "lucide-react";
import type { SongWithDetails } from "@/lib/api";
import {
  fetchActiveResearchAnalysis,
  importResearchAnalysis,
  validateResearchAnalysis,
} from "@/lib/api";
import { buildResearchPrompt } from "@/lib/research-prompt";
import type { ResearchAnalysisV02, SongResearchAnalysis } from "@/types/research";
import { useResearchAdminToken } from "@/hooks/useResearchAdminToken";
import ResearchAdminTokenPrompt from "@/components/research/ResearchAdminTokenPrompt";

type ImportStep = "paste" | "preview" | "saving";

export default function ResearchAnalysisPanel({ song }: { song: SongWithDetails }) {
  const { token, ready, saveToken, clearToken } = useResearchAdminToken();
  const [recordState, setRecordState] = useState<{ key: string; record: SongResearchAnalysis | null; loading: boolean }>({ key: "", record: null, loading: true });
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [rawJson, setRawJson] = useState("");
  const [validated, setValidated] = useState<ResearchAnalysisV02 | null>(null);
  const [derivedCount, setDerivedCount] = useState(0);
  const [step, setStep] = useState<ImportStep>("paste");
  const [errors, setErrors] = useState<string[]>([]);
  const recordKey = `${song.id}:${token}`;
  const { record, loading } = recordState.key === recordKey
    ? recordState
    : { record: null, loading: Boolean(token) };

  useEffect(() => {
    if (!ready) return;
    if (!token) return;
    let cancelled = false;
    fetchActiveResearchAnalysis(song.id, token)
      .then((analysis) => { if (!cancelled) setRecordState({ key: recordKey, record: analysis, loading: false }); })
      .catch(() => {
        // Expected before migration 0005 is applied. Existing song detail stays usable.
        if (!cancelled) setRecordState({ key: recordKey, record: null, loading: false });
      })
    return () => { cancelled = true; };
  }, [ready, recordKey, song.id, token]);

  const analysis = record?.analysis_json ?? null;

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(buildResearchPrompt(song));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const parseApiErrors = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    const jsonStart = message.indexOf("{");
    if (jsonStart >= 0) {
      try {
        const parsed = JSON.parse(message.slice(jsonStart));
        const detail = parsed.detail;
        if (Array.isArray(detail?.errors)) return detail.errors as string[];
        if (typeof detail === "string") return [detail];
      } catch {
        // Fall through to the original message.
      }
    }
    return [message];
  };

  const validate = async () => {
    setErrors([]);
    setValidated(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch (error) {
      setErrors([`JSONとして読み取れません: ${error instanceof Error ? error.message : String(error)}`]);
      return;
    }
    try {
      const result = await validateResearchAnalysis(parsed);
      if (result.analysis.song.id !== song.id) {
        setErrors(["$.song.id: 現在の楽曲IDと一致しません。"]) ;
        return;
      }
      setValidated(result.analysis);
      setDerivedCount(result.derived_item_count);
      setStep("preview");
    } catch (error) {
      setErrors(parseApiErrors(error));
    }
  };

  const save = async () => {
    if (!validated) return;
    setStep("saving");
    setErrors([]);
    try {
      const saved = await importResearchAnalysis(song.id, validated, token);
      setRecordState({ key: recordKey, record: saved, loading: false });
      setOpen(false);
      setRawJson("");
      setValidated(null);
      setStep("paste");
    } catch (error) {
      setErrors([
        ...parseApiErrors(error),
        "migration 0005が未適用の場合は保存できません。DB適用確認後に再実行してください。",
      ]);
      setStep("preview");
    }
  };

  return (
    <section className="mb-8 rounded-lg border border-emerald-200 bg-[#fbfdfb]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Research</p>
          <h2 className="mt-1 text-[16px] font-bold text-[#334039]">ChatGPT研究分析</h2>
        </div>
        <div className="flex gap-2">
          {token && <button onClick={clearToken} className="rounded-md border border-[#dfe5df] bg-white px-3 py-2 text-[10px] font-bold text-[#737b75] hover:bg-[#f4f6f4]">トークン解除</button>}
          <button onClick={copyPrompt} className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-3 py-2 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50">
            {copied ? <Check size={13} /> : <Clipboard size={13} />}
            {copied ? "コピーしました" : "分析用プロンプトをコピー"}
          </button>
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-800">
            <Download size={13} />ChatGPT分析を取り込む
          </button>
        </div>
      </div>

      <div className="p-5">
        {!ready ? null : !token ? (
          <ResearchAdminTokenPrompt onSubmit={saveToken} />
        ) : loading ? (
          <p className="text-[12px] text-[#8a938c]">研究分析を確認中...</p>
        ) : analysis ? (
          <ResearchAnalysisView analysis={analysis} />
        ) : (
          <div className="flex items-start gap-3 rounded-md border border-dashed border-emerald-200 bg-white px-4 py-5">
            <BookOpen size={18} className="mt-0.5 text-emerald-500" />
            <div>
              <p className="text-[13px] font-bold text-[#475149]">研究分析はまだありません</p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#879088]">プロンプトをChatGPTへ持ち出して対話的に深掘りし、最後に出力したv0.2 JSONを取り込めます。</p>
            </div>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="ChatGPT研究分析を取り込む">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-[#e6ebe6] px-5 py-4">
              <div>
                <h3 className="text-[15px] font-bold text-[#354039]">ChatGPT研究分析を取り込む</h3>
                <p className="mt-0.5 text-[10px] text-[#8c948e]">JSON貼り付け → 検証 → プレビュー → 保存</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded p-1.5 text-[#929993] hover:bg-[#f1f4f1]" aria-label="閉じる"><X size={17} /></button>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              {step === "paste" ? (
                <textarea
                  value={rawJson}
                  onChange={(event) => setRawJson(event.target.value)}
                  placeholder="ChatGPTが出力したJSONを貼り付けてください"
                  spellCheck={false}
                  className="min-h-[360px] w-full resize-y rounded-lg border border-[#dfe5df] bg-[#fafcfa] p-4 font-mono text-[12px] leading-relaxed text-[#354039] outline-none focus:border-emerald-400"
                />
              ) : validated ? (
                <div>
                  <div className="mb-4 flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                    <span className="font-bold">v0.2 検証済み</span>
                    <span>検索項目 {derivedCount}件を生成予定</span>
                  </div>
                  <ResearchAnalysisView analysis={validated} />
                </div>
              ) : null}

              {errors.length > 0 && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="mb-2 text-[11px] font-bold text-red-700">確認が必要です</p>
                  <ul className="space-y-1 text-[11px] text-red-700">
                    {errors.map((error, index) => <li key={`${error}-${index}`}>・{error}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <footer className="flex justify-between border-t border-[#e6ebe6] px-5 py-4">
              <button onClick={() => { setStep("paste"); setValidated(null); setErrors([]); }} disabled={step === "paste"} className="px-3 py-2 text-[11px] font-bold text-[#737b75] disabled:opacity-0">貼り付けへ戻る</button>
              {step === "paste" ? (
                <button onClick={validate} disabled={!rawJson.trim()} className="rounded-md bg-emerald-700 px-4 py-2 text-[11px] font-bold text-white disabled:opacity-40">検証する</button>
              ) : (
                <button onClick={save} disabled={step === "saving"} className="rounded-md bg-emerald-700 px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50">{step === "saving" ? "保存中..." : "この版を保存"}</button>
              )}
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}

function ResearchAnalysisView({ analysis }: { analysis: ResearchAnalysisV02 }) {
  const expressions = [
    ["文末", analysis.expression_patterns.sentence_endings],
    ["接続", analysis.expression_patterns.connections],
    ["修飾", analysis.expression_patterns.modifiers],
  ] as const;

  return (
    <div className="space-y-6 text-[#424b44]">
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#89918b]">Summary</h3>
        {analysis.summary.overview && <p className="mt-2 text-[13px] leading-7">{analysis.summary.overview}</p>}
        {analysis.summary.key_insights.length > 0 && <ul className="mt-2 space-y-1 text-[12px]">{analysis.summary.key_insights.map((item) => <li key={item}>・{item}</li>)}</ul>}
      </div>

      {analysis.techniques.length > 0 && <ResearchGroup title="作詞技法">{analysis.techniques.map((item, index) => (
        <details key={`${item.name}-${index}`} className="rounded-md border border-[#e2e7e2] bg-white px-3 py-2">
          <summary className="cursor-pointer list-none text-[12px] font-bold"><span className="mr-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] text-emerald-700">{item.category}</span>{item.name}</summary>
          <div className="mt-3 space-y-2 border-t border-[#eef1ee] pt-3 text-[11px] leading-relaxed text-[#667068]">
            {item.description && <p>{item.description}</p>}
            {item.why_it_works && <p><strong>効き方:</strong> {item.why_it_works}</p>}
            {item.evidence.map((evidence, evidenceIndex) => <blockquote key={evidenceIndex} className="border-l-2 border-emerald-200 pl-3">「{evidence.quote}」{evidence.section ? `（${evidence.section}）` : ""}{evidence.explanation ? ` — ${evidence.explanation}` : ""}</blockquote>)}
            {item.reuse_hint && <p><strong>転用:</strong> {item.reuse_hint}</p>}
          </div>
        </details>
      ))}</ResearchGroup>}

      {expressions.some(([, items]) => items.length > 0) && <ResearchGroup title="表現パターン">{expressions.flatMap(([label, items]) => items.map((item, index) => (
        <div key={`${label}-${item.expression}-${index}`} className="rounded-md border border-[#e2e7e2] bg-white p-3">
          <p className="text-[9px] font-bold text-emerald-700">{label}</p><p className="mt-1 text-[13px] font-bold">{item.expression}</p>
          {item.description && <p className="mt-1 text-[11px] leading-relaxed text-[#69716b]">{item.description}</p>}
        </div>
      )))}</ResearchGroup>}

      {analysis.motifs.length > 0 && <ResearchGroup title="モチーフ">{analysis.motifs.map((motif) => (
        <div key={motif.name} className="rounded-md border border-[#e2e7e2] bg-white p-3">
          <p className="text-[12px] font-bold">{motif.name}</p>
          <p className="mt-2 text-[11px] text-emerald-800">{motif.elements.map((element) => element.text).join(" → ")}</p>
          {motif.development && <p className="mt-2 text-[11px] leading-relaxed text-[#69716b]">{motif.development}</p>}
        </div>
      ))}</ResearchGroup>}

      {Object.values(analysis.structure).some(Boolean) && <ResearchGroup title="構造"><div className="rounded-md border border-[#e2e7e2] bg-white p-3 text-[11px] leading-relaxed text-[#69716b]">{Object.entries(analysis.structure).filter(([, value]) => value).map(([key, value]) => <p key={key} className="mb-2 last:mb-0"><strong>{key.replaceAll("_", " ")}:</strong> {value}</p>)}</div></ResearchGroup>}

      {analysis.takeaways.length > 0 && <ResearchGroup title="持ち帰ること">{analysis.takeaways.map((item) => (
        <div key={item.title} className="rounded-md border border-[#e2e7e2] bg-white p-3 text-[11px] leading-relaxed">
          <p className="text-[12px] font-bold">{item.title}</p>
          {item.description && <p className="mt-1 text-[#69716b]">{item.description}</p>}
          {item.how_to_use && <p className="mt-2"><strong>使い方:</strong> {item.how_to_use}</p>}
          {item.avoid_copying && <p className="mt-1 text-amber-700"><strong>模倣を避ける:</strong> {item.avoid_copying}</p>}
        </div>
      ))}</ResearchGroup>}
    </div>
  );
}

function ResearchGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#89918b]">{title}</h3><div className="grid gap-2 sm:grid-cols-2">{children}</div></div>;
}

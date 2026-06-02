"use client";

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, Cell,
} from 'recharts';

// ============================
// 定数
// ============================
const API_BASE = "http://localhost:8000";

const VOWEL_COLORS: Record<string, string> = {
  a: 'bg-red-400',
  i: 'bg-blue-400',
  u: 'bg-green-400',
  e: 'bg-yellow-500',
  o: 'bg-purple-400',
};

const TIMELINE_LABELS: Record<string, string> = {
  past: '過去', present: '現在', future: '未来', mixed: '混合',
};

// ============================
// セクション分割パーサー
// ============================
function parseSections(rawText: string): { section_name: string; lyrics_raw: string }[] {
  const lines = rawText.split("\n");
  const sections: { section_name: string; lyrics_raw: string }[] = [];
  const tagPattern = /^\[(.+?)\]\s*$/;
  const hasTags = lines.some((line) => tagPattern.test(line.trim()));

  if (hasTags) {
    let currentName = "";
    let currentLines: string[] = [];
    for (const line of lines) {
      const match = line.trim().match(tagPattern);
      if (match) {
        if (currentName && currentLines.length > 0) {
          sections.push({ section_name: currentName, lyrics_raw: currentLines.join("\n").trim() });
        }
        currentName = match[1];
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }
    if (currentName && currentLines.length > 0) {
      sections.push({ section_name: currentName, lyrics_raw: currentLines.join("\n").trim() });
    }
  } else {
    let currentLines: string[] = [];
    let sectionIndex = 1;
    for (const line of lines) {
      if (line.trim() === "") {
        if (currentLines.length > 0) {
          sections.push({ section_name: `セクション${sectionIndex}`, lyrics_raw: currentLines.join("\n").trim() });
          sectionIndex++;
          currentLines = [];
        }
      } else {
        currentLines.push(line);
      }
    }
    if (currentLines.length > 0) {
      sections.push({
        section_name: sections.length === 0 ? "全体" : `セクション${sectionIndex}`,
        lyrics_raw: currentLines.join("\n").trim(),
      });
    }
  }
  return sections;
}

// ============================
// サンプル歌詞
// ============================
const SAMPLE_LYRICS = `[Aメロ]
冷たい炎が 胸を焦がす
昨日の君が 遠ざかる

[Bメロ]
言葉にできない 想いだけが
夜の底で 静かに揺れる

[サビ]
忘れないよ あの日の空
僕らが見た 永遠の光`;

// ============================
// メインコンポーネント
// ============================
export default function MiyashitaOS() {
  const [activeTab, setActiveTab] = useState('editor');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // エディタ
  const [songTitle, setSongTitle] = useState("テスト楽曲");
  const [songArtist, setSongArtist] = useState("テストアーティスト");
  const [lyricsText, setLyricsText] = useState(SAMPLE_LYRICS);
  const [parsedSections, setParsedSections] = useState<any[]>([]);

  // 総合DB
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [filterTag, setFilterTag] = useState<string>("");

  // ストック辞書
  const [phraseStocks, setPhraseStocks] = useState<any[]>([]);

  // 初期化
  useEffect(() => {
    setParsedSections(parseSections(lyricsText));
  }, []);

  // タブ切り替え時にデータを取得
  useEffect(() => {
    if (activeTab === 'db') { loadDbData(); }
    if (activeTab === 'editor') { loadPhraseStocks(); }
  }, [activeTab]);

  // ============================
  // API呼び出し
  // ============================
  const handleAnalyze = async () => {
    const sections = parseSections(lyricsText);
    if (sections.length === 0) { alert("歌詞が入力されていません。"); return; }
    setLoading(true);
    try {
      const payload = {
        song_id: `song-${Date.now()}`,
        title: songTitle || "無題",
        artist: songArtist || "不明",
        sections,
      };
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setAnalysisResult(data);
      setActiveTab('insight');
    } catch (err) {
      console.error(err);
      alert("分析中にエラーが発生しました。バックエンドが起動しているか確認してください。");
    } finally {
      setLoading(false);
    }
  };

  const loadDbData = async () => {
    setDbLoading(true);
    try {
      const [songsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/songs`),
        fetch(`${API_BASE}/api/stats${filterTag ? `?evaluation_tag=${filterTag}` : ''}`),
      ]);
      if (songsRes.ok) { const d = await songsRes.json(); setAllSongs(d.songs || []); }
      if (statsRes.ok) { const d = await statsRes.json(); setStats(d); }
    } catch (err) { console.error("DB取得エラー:", err); }
    finally { setDbLoading(false); }
  };

  const loadPhraseStocks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/phrase-stocks`);
      if (res.ok) { const d = await res.json(); setPhraseStocks(d.stocks || []); }
    } catch (err) { console.error("ストック取得エラー:", err); }
  };

  const handleDeleteSong = async (songId: string) => {
    if (!confirm("この楽曲を削除しますか？")) return;
    try {
      await fetch(`${API_BASE}/api/songs/${songId}`, { method: "DELETE" });
      loadDbData();
    } catch (err) { console.error(err); }
  };

  const handleUpdateTag = async (songId: string, tag: string) => {
    try {
      await fetch(`${API_BASE}/api/songs/${songId}/tag`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluation_tag: tag }),
      });
      loadDbData();
    } catch (err) { console.error(err); }
  };

  // ============================
  // 波形グラフ用データの生成
  // ============================
  const getSentimentChartData = () => {
    if (!analysisResult?.sections) return [];
    return analysisResult.sections.map((sec: any) => ({
      name: sec.section_name,
      感情極性: sec.sentiment_score,
      具象度: sec.extracted_rhetoric?.length || 0,
    }));
  };

  const getTimelineChartData = () => {
    if (!analysisResult?.sections) return [];
    const timelineMap: Record<string, number> = { past: -1, present: 0, future: 1, mixed: 0.5 };
    return analysisResult.sections.map((sec: any) => ({
      name: sec.section_name,
      時間軸: timelineMap[sec.timeline] ?? 0,
    }));
  };

  // ストック辞書の整理
  const rhetoricStocks = phraseStocks.filter(s => s.stock_type === 'rhetoric');
  const phraseStartStocks = phraseStocks.filter(s => s.stock_type === 'phrase_start');
  const phraseEndStocks = phraseStocks.filter(s => s.stock_type === 'phrase_end');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6 font-sans">
      <header className="mb-6 border-b pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-indigo-700">みやした歌詞OS</h1>
          <p className="text-sm text-gray-500">計量的文体論 x LLM 作詞支援システム</p>
        </div>
        <nav className="flex space-x-2">
          {['db', 'insight', 'editor'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {tab === 'db' ? '総合DB & 傾向' : tab === 'insight' ? '個別インサイト' : '作詞エディタ'}
            </button>
          ))}
        </nav>
      </header>

      <main className="bg-white rounded-lg shadow-sm p-6 min-h-[70vh]">

        {/* ============================================ */}
        {/* === 作詞エディタ タブ === */}
        {/* ============================================ */}
        {activeTab === 'editor' && (
          <div className="flex gap-6">
            <div className="flex-1 flex flex-col space-y-4">
              <h2 className="text-xl font-bold border-b pb-2">エディタ・解析実行</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">楽曲タイトル</label>
                  <input type="text" value={songTitle} onChange={(e) => setSongTitle(e.target.value)}
                    className="w-full px-3 py-2 border rounded bg-gray-50 focus:ring-2 focus:ring-indigo-300 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">アーティスト名</label>
                  <input type="text" value={songArtist} onChange={(e) => setSongArtist(e.target.value)}
                    className="w-full px-3 py-2 border rounded bg-gray-50 focus:ring-2 focus:ring-indigo-300 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">
                  歌詞テキスト — <code className="bg-gray-200 px-1 rounded">[Aメロ]</code> 等のタグでセクション分割
                </label>
                <textarea
                  className="w-full h-64 p-4 border rounded bg-gray-50 focus:ring-2 focus:ring-indigo-300 focus:outline-none font-mono text-sm leading-relaxed"
                  value={lyricsText}
                  onChange={(e) => { setLyricsText(e.target.value); setParsedSections(parseSections(e.target.value)); }}
                />
              </div>
              {parsedSections.length > 0 && (
                <div className="p-3 bg-gray-50 border rounded text-sm">
                  <span className="text-xs text-gray-400 font-medium">セクション分割プレビュー：</span>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {parsedSections.map((sec, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                        {sec.section_name} <span className="text-indigo-400">({sec.lyrics_raw.split('\n').filter((l: string) => l.trim()).length}行)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={handleAnalyze} disabled={loading}
                className="bg-indigo-600 text-white py-3 rounded font-bold hover:bg-indigo-700 disabled:bg-indigo-300 flex justify-center items-center transition-colors">
                {loading ? (
                  <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>分析中...</>
                ) : `🔍 ${parsedSections.length}セクションを解析する`}
              </button>
              {analysisResult && (
                <div className="mt-2 p-4 bg-indigo-50 border border-indigo-100 rounded">
                  <h3 className="font-bold text-indigo-800 mb-2">✅ 解析完了 — 「{analysisResult.title}」</h3>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    {[
                      { label: '具象度', value: `${analysisResult.macro_metrics.concreteness_score}/4` },
                      { label: '名詞比率', value: `${(analysisResult.macro_metrics.noun_ratio * 100).toFixed(1)}%` },
                      { label: '一人称', value: `${analysisResult.macro_metrics.first_person_count}回` },
                      { label: '二人称', value: `${analysisResult.macro_metrics.second_person_count}回` },
                    ].map((m, i) => (
                      <div key={i} className="bg-white p-3 rounded shadow-sm">
                        <span className="block text-gray-500 text-xs">{m.label}</span>
                        <span className="text-xl font-bold text-indigo-600">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* サイドパネル：ストック辞書 */}
            <div className="w-80 bg-gray-100 p-4 rounded border max-h-[80vh] overflow-y-auto">
              <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">📚 ストック辞書</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="text-indigo-600 font-semibold text-xs mb-1">▶ レトリック（{rhetoricStocks.length}件）</h4>
                  {rhetoricStocks.length > 0 ? (
                    <ul className="space-y-1">
                      {rhetoricStocks.slice(0, 10).map((s, i) => (
                        <li key={i} className="bg-white p-2 rounded border text-xs">
                          <span className="inline-block bg-orange-100 text-orange-700 px-1 rounded text-[10px]">{s.rhetoric_type}</span>
                          <span className="ml-1 font-bold">{s.phrase}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-gray-400 text-xs">解析を実行するとここに蓄積されます</p>}
                </div>
                <div>
                  <h4 className="text-indigo-600 font-semibold text-xs mb-1">▶ 文頭表現（{phraseStartStocks.length}件）</h4>
                  {phraseStartStocks.length > 0 ? (
                    <ul className="list-disc pl-4 text-gray-600 space-y-1">
                      {phraseStartStocks.slice(0, 8).map((s, i) => <li key={i}>{s.phrase}</li>)}
                    </ul>
                  ) : <p className="text-gray-400 text-xs">—</p>}
                </div>
                <div>
                  <h4 className="text-indigo-600 font-semibold text-xs mb-1">▶ 文末表現（{phraseEndStocks.length}件）</h4>
                  {phraseEndStocks.length > 0 ? (
                    <ul className="list-disc pl-4 text-gray-600 space-y-1">
                      {phraseEndStocks.slice(0, 8).map((s, i) => <li key={i}>{s.phrase}</li>)}
                    </ul>
                  ) : <p className="text-gray-400 text-xs">—</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* === 個別インサイト タブ === */}
        {/* ============================================ */}
        {activeTab === 'insight' && (
          <div>
            <h2 className="text-xl font-bold border-b pb-2 mb-4">ミクロ分析＆構造解剖</h2>
            {analysisResult ? (
              <div className="space-y-6">
                {/* マクロサマリー */}
                <div className="p-4 bg-indigo-50 rounded border border-indigo-100">
                  <h3 className="text-sm font-bold text-indigo-800 mb-2">📊 「{analysisResult.title}」 — マクロ指標</h3>
                  <div className="grid grid-cols-6 gap-2 text-xs">
                    {[
                      { label: '名詞', value: `${(analysisResult.macro_metrics.noun_ratio * 100).toFixed(1)}%` },
                      { label: '動詞', value: `${(analysisResult.macro_metrics.verb_ratio * 100).toFixed(1)}%` },
                      { label: '形容詞', value: `${(analysisResult.macro_metrics.adjective_ratio * 100).toFixed(1)}%` },
                      { label: '一人称', value: `${analysisResult.macro_metrics.first_person_count}回` },
                      { label: '二人称', value: `${analysisResult.macro_metrics.second_person_count}回` },
                      { label: '総トークン', value: analysisResult.macro_metrics.total_tokens },
                    ].map((m, i) => (
                      <div key={i} className="bg-white p-2 rounded shadow-sm text-center">
                        <span className="block text-gray-400">{m.label}</span>
                        <span className="font-bold text-indigo-600">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 波形グラフ: 感情推移 & 時間軸 */}
                {analysisResult.sections.length > 1 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white border rounded">
                      <h4 className="text-xs font-bold text-gray-500 mb-2">📈 感情極性の推移（セクション別）</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={getSentimentChartData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" fontSize={12} />
                          <YAxis domain={[-1, 1]} fontSize={11} />
                          <Tooltip />
                          <Line type="monotone" dataKey="感情極性" stroke="#6366f1" strokeWidth={2} dot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="p-4 bg-white border rounded">
                      <h4 className="text-xs font-bold text-gray-500 mb-2">⏳ 時間軸の推移（セクション別）</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={getTimelineChartData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" fontSize={12} />
                          <YAxis domain={[-1.5, 1.5]} ticks={[-1, 0, 1]} fontSize={11}
                            tickFormatter={(v) => v === -1 ? '過去' : v === 0 ? '現在' : '未来'} />
                          <Tooltip />
                          <Line type="monotone" dataKey="時間軸" stroke="#f59e0b" strokeWidth={2} dot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* セクション別の詳細 */}
                {analysisResult.sections.map((sec: any, idx: number) => (
                  <div key={idx} className="border rounded-lg overflow-hidden">
                    <div className="bg-indigo-600 text-white px-4 py-2 flex justify-between items-center">
                      <span className="font-bold">{sec.section_name}</span>
                      <div className="flex space-x-4 text-xs">
                        <span>⏳ {TIMELINE_LABELS[sec.timeline] || sec.timeline}</span>
                        <span>{sec.sentiment_score > 0 ? '😊' : sec.sentiment_score < 0 ? '😢' : '😐'} {sec.sentiment_score}</span>
                      </div>
                    </div>
                    <div className="p-4 flex gap-4">
                      <div className="flex-1">
                        <h4 className="text-xs text-gray-500 font-bold mb-2">🔤 歌詞 / モーラ / 末尾母音 (Python)</h4>
                        <div className="space-y-2 font-mono text-sm">
                          {sec.lyrics_raw.split('\n').filter((l: string) => l.trim()).map((line: string, l_idx: number) => (
                            <div key={l_idx} className="flex items-center gap-3">
                              <span className="w-56 truncate text-gray-800">{line}</span>
                              <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500 w-14 text-center font-bold">{sec.mora_counts?.[l_idx]}音</span>
                              <span className={`px-2 py-1 rounded text-xs text-white font-bold w-6 text-center ${VOWEL_COLORS[sec.end_vowels?.[l_idx]] || 'bg-gray-400'}`}>
                                {sec.end_vowels?.[l_idx] || "?"}
                              </span>
                              <div className="flex gap-0.5 flex-wrap">
                                {sec.vowels?.[l_idx]?.map((v: string, v_idx: number) => (
                                  <span key={v_idx} className={`w-4 h-4 flex items-center justify-center text-[9px] rounded-full text-white ${VOWEL_COLORS[v] || 'bg-gray-400'}`}>{v}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="w-1/3 bg-orange-50 p-3 rounded">
                        <h4 className="text-xs text-orange-800 font-bold mb-2">🎭 レトリック (LLM)</h4>
                        {sec.extracted_rhetoric?.length > 0 ? (
                          sec.extracted_rhetoric.map((r: any, r_idx: number) => (
                            <div key={r_idx} className="mb-2 bg-white p-2 border border-orange-200 rounded text-sm">
                              <span className="inline-block bg-orange-200 text-orange-800 text-[10px] px-1 rounded mb-1">{r.type}</span>
                              <div className="font-bold text-gray-800">{r.phrase}</div>
                              <div className="text-xs text-gray-500 mt-1">{r.reason}</div>
                            </div>
                          ))
                        ) : <p className="text-xs text-gray-400">レトリックデータなし</p>}
                        {(sec.phrase_start || sec.phrase_end) && (
                          <div className="mt-3 pt-3 border-t border-orange-200">
                            <h5 className="text-[10px] text-orange-600 font-bold mb-1">📝 フレーズ</h5>
                            {sec.phrase_start && <div className="text-xs">文頭: <b>「{sec.phrase_start}」</b></div>}
                            {sec.phrase_end && <div className="text-xs">文末: <b>「{sec.phrase_end}」</b></div>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500">エディタタブで解析を実行してください。</p>}
          </div>
        )}

        {/* ============================================ */}
        {/* === 総合DB & 傾向レポート タブ === */}
        {/* ============================================ */}
        {activeTab === 'db' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-xl font-bold">総合データベース＆傾向レポート</h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">フィルタ:</label>
                <select value={filterTag} onChange={(e) => { setFilterTag(e.target.value); }}
                  className="text-sm border rounded px-2 py-1">
                  <option value="">すべて</option>
                  <option value="like">👍 Like</option>
                  <option value="dislike">👎 Dislike</option>
                  <option value="neutral">😐 Neutral</option>
                </select>
                <button onClick={loadDbData} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-200">
                  🔄 更新
                </button>
              </div>
            </div>

            {dbLoading ? (
              <p className="text-gray-400 text-center py-8">読み込み中...</p>
            ) : (
              <>
                {/* 平均値集計レポート */}
                {stats && stats.count > 0 && (
                  <div className="p-4 bg-indigo-50 rounded border border-indigo-100">
                    <h3 className="text-sm font-bold text-indigo-800 mb-3">📊 傾向レポート（{stats.count}曲の平均）</h3>
                    <div className="grid grid-cols-7 gap-2 text-xs">
                      {[
                        { label: '名詞比率', value: `${(stats.avg_noun_ratio * 100).toFixed(1)}%` },
                        { label: '動詞比率', value: `${(stats.avg_verb_ratio * 100).toFixed(1)}%` },
                        { label: '形容詞比率', value: `${(stats.avg_adjective_ratio * 100).toFixed(1)}%` },
                        { label: '一人称/曲', value: `${stats.avg_first_person_count}回` },
                        { label: '二人称/曲', value: `${stats.avg_second_person_count}回` },
                        { label: 'トークン/曲', value: `${stats.avg_total_tokens}` },
                        { label: '具象度', value: `${stats.avg_concreteness_score}/4` },
                      ].map((m, i) => (
                        <div key={i} className="bg-white p-2 rounded shadow-sm text-center">
                          <span className="block text-gray-400">{m.label}</span>
                          <span className="font-bold text-indigo-600">{m.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 登録曲一覧 */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-2">🎵 登録楽曲一覧（{allSongs.length}曲）</h3>
                  {allSongs.length > 0 ? (
                    <div className="border rounded overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left px-3 py-2">タイトル</th>
                            <th className="text-left px-3 py-2">アーティスト</th>
                            <th className="text-center px-3 py-2">名詞</th>
                            <th className="text-center px-3 py-2">具象度</th>
                            <th className="text-center px-3 py-2">一人称</th>
                            <th className="text-center px-3 py-2">タグ</th>
                            <th className="text-center px-3 py-2">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allSongs.map((song, idx) => (
                            <tr key={idx} className="border-t hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium">{song.title}</td>
                              <td className="px-3 py-2 text-gray-500">{song.artist}</td>
                              <td className="px-3 py-2 text-center">{((song.noun_ratio || 0) * 100).toFixed(1)}%</td>
                              <td className="px-3 py-2 text-center">{song.concreteness_score}/4</td>
                              <td className="px-3 py-2 text-center">{song.first_person_count}</td>
                              <td className="px-3 py-2 text-center">
                                <select value={song.evaluation_tag || 'like'}
                                  onChange={(e) => handleUpdateTag(song.song_id, e.target.value)}
                                  className="text-xs border rounded px-1 py-0.5">
                                  <option value="like">👍</option>
                                  <option value="dislike">👎</option>
                                  <option value="neutral">😐</option>
                                </select>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button onClick={() => handleDeleteSong(song.song_id)}
                                  className="text-red-400 hover:text-red-600 text-xs">🗑️</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-300 text-gray-400 text-sm">
                      まだ楽曲が登録されていません。エディタタブで解析を実行すると自動で保存されます。
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

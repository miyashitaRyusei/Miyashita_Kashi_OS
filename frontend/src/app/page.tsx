"use client";

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { 
  PenLine, BarChart2, Database, Play, Sparkles, BookOpen, Music, Search,
  Trash2, ChevronRight, Hash, Clock, Settings
} from 'lucide-react';

// ============================
// 定数
// ============================
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Notion風のパステル調（上品な色合い）の母音カラー
const VOWEL_COLORS: Record<string, string> = {
  a: 'bg-red-50 text-red-600 border-red-100',
  i: 'bg-blue-50 text-blue-600 border-blue-100',
  u: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  e: 'bg-amber-50 text-amber-600 border-amber-100',
  o: 'bg-purple-50 text-purple-600 border-purple-100',
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

// サンプル歌詞
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
  const [songTitle, setSongTitle] = useState("無題のドキュメント");
  const [songArtist, setSongArtist] = useState("");
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
    if (activeTab === 'db') loadDbData();
    if (activeTab === 'editor') loadPhraseStocks();
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
        title: songTitle || "無題のドキュメント",
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

  const getChartData = () => {
    if (!analysisResult?.sections) return [];
    const timelineMap: Record<string, number> = { past: -1, present: 0, future: 1, mixed: 0.5 };
    return analysisResult.sections.map((sec: any) => ({
      name: sec.section_name,
      感情極性: sec.sentiment_score,
      時間軸: timelineMap[sec.timeline] ?? 0,
      情報密度: sec.information_density ?? 0,
    }));
  };

  const scatterData = allSongs.map(s => {
    const density = s.macro_metrics?.information_density 
      || (s.sections && s.sections.length > 0 ? s.sections.reduce((acc: number, sec: any) => acc + (sec.information_density || 0), 0) / s.sections.length : 0);
    return {
      name: s.title,
      x: s.concreteness_score || 3,
      y: Number(density.toFixed(3)),
      tag: s.evaluation_tag
    };
  });

  const rhetoricStocks = phraseStocks.filter(s => s.stock_type === 'rhetoric');
  const phraseStartStocks = phraseStocks.filter(s => s.stock_type === 'phrase_start');
  const phraseEndStocks = phraseStocks.filter(s => s.stock_type === 'phrase_end');

  // ナビゲーションメニュー
  const navItems = [
    { id: 'editor', label: '作詞エディタ', icon: PenLine },
    { id: 'insight', label: '個別インサイト', icon: Sparkles },
    { id: 'db', label: '総合DB', icon: Database },
  ];

  return (
    <div className="flex h-screen w-full bg-white text-[#37352f] overflow-hidden">
      
      {/* ============================================ */}
      {/* === 左サイドバー (Notion風) === */}
      {/* ============================================ */}
      <aside className="w-64 bg-[#fbfbfa] border-r border-[#e9e9e7] flex flex-col flex-shrink-0 transition-all">
        {/* Workspace Title */}
        <div className="p-4 flex items-center gap-2 hover:bg-[#efefed] cursor-pointer transition-colors m-2 rounded-md">
          <div className="w-5 h-5 bg-black text-white rounded text-[10px] flex items-center justify-center font-bold">M</div>
          <span className="font-semibold text-sm">みやした歌詞OS</span>
        </div>

        <div className="px-3 py-2 text-xs font-semibold text-[#787774] mt-2">ワークスペース</div>
        
        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  isActive ? 'bg-[#efefed] font-medium text-[#37352f]' : 'text-[#787774] hover:bg-[#efefed] hover:text-[#37352f]'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-[#37352f]' : 'text-[#9ca3af]'} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-[#e9e9e7] text-xs text-[#787774] flex items-center gap-2">
          <Settings size={14} />
          <span>設定・API連携</span>
        </div>
      </aside>

      {/* ============================================ */}
      {/* === メインコンテンツ === */}
      {/* ============================================ */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        
        {/* --- エディタ タブ --- */}
        {activeTab === 'editor' && (
          <div className="flex h-full">
            <div className="flex-1 overflow-y-auto px-16 py-12">
              
              {/* ドキュメントヘッダー */}
              <div className="max-w-3xl mx-auto mb-8">
                <input 
                  type="text" 
                  value={songTitle} 
                  onChange={(e) => setSongTitle(e.target.value)}
                  className="w-full text-4xl font-bold text-[#37352f] placeholder-[#d4d4d2] bg-transparent border-none focus:outline-none focus:ring-0 mb-4"
                  placeholder="無題のドキュメント"
                />
                <div className="flex items-center gap-2 text-[#787774]">
                  <Music size={16} />
                  <input 
                    type="text" 
                    value={songArtist} 
                    onChange={(e) => setSongArtist(e.target.value)}
                    className="flex-1 bg-transparent border-none text-sm focus:outline-none focus:ring-0 placeholder-[#d4d4d2]"
                    placeholder="アーティスト名を追加..."
                  />
                </div>
              </div>

              {/* 歌詞エディタ本文 */}
              <div className="max-w-3xl mx-auto relative group">
                <textarea
                  className="w-full min-h-[50vh] text-[#37352f] bg-transparent border-none resize-none focus:outline-none focus:ring-0 leading-loose text-base"
                  placeholder={`[Aメロ]\nここに歌詞を入力...\n\n[サビ]\nここにサビの歌詞...`}
                  value={lyricsText}
                  onChange={(e) => { setLyricsText(e.target.value); }}
                />
                
                {/* フローティング アクションバー */}
                <div className="sticky bottom-8 left-0 right-0 flex justify-center pb-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={handleAnalyze} 
                    disabled={loading}
                    className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-all"
                  >
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> 分析中...</>
                    ) : (
                      <><Sparkles size={16} /> {parsedSections.length}セクションを解析する</>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 右サイドバー: ストック辞書 */}
            <div className="w-72 border-l border-[#e9e9e7] bg-[#fbfbfa] flex flex-col h-full overflow-hidden">
              <div className="p-4 font-semibold text-sm border-b border-[#e9e9e7] flex items-center gap-2">
                <BookOpen size={16} className="text-[#787774]" /> ストック辞書
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                  <h4 className="text-xs font-semibold text-[#787774] mb-2 flex items-center gap-1"><Hash size={12}/> 抽出レトリック</h4>
                  {rhetoricStocks.length > 0 ? (
                    <ul className="space-y-2">
                      {rhetoricStocks.slice(0, 10).map((s, i) => (
                        <li key={i} className="bg-white p-2.5 rounded border border-[#e9e9e7] text-xs shadow-sm">
                          <span className="inline-block px-1.5 py-0.5 bg-[#f3f4f6] text-[#4b5563] rounded text-[10px] mb-1 font-medium">{s.rhetoric_type}</span>
                          <div className="font-medium text-[#37352f]">{s.phrase}</div>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-[#9ca3af] text-xs">データがありません</p>}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#787774] mb-2 flex items-center gap-1"><ChevronRight size={12}/> 文頭表現</h4>
                  {phraseStartStocks.length > 0 ? (
                    <ul className="space-y-1">
                      {phraseStartStocks.slice(0, 8).map((s, i) => (
                        <li key={i} className="text-sm text-[#37352f] pl-2 border-l-2 border-[#e5e7eb]">{s.phrase}</li>
                      ))}
                    </ul>
                  ) : <p className="text-[#9ca3af] text-xs">データがありません</p>}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#787774] mb-2 flex items-center gap-1"><ChevronRight size={12}/> 文末表現</h4>
                  {phraseEndStocks.length > 0 ? (
                    <ul className="space-y-1">
                      {phraseEndStocks.slice(0, 8).map((s, i) => (
                        <li key={i} className="text-sm text-[#37352f] pl-2 border-l-2 border-[#e5e7eb]">{s.phrase}</li>
                      ))}
                    </ul>
                  ) : <p className="text-[#9ca3af] text-xs">データがありません</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- インサイト タブ --- */}
        {activeTab === 'insight' && (
          <div className="flex-1 overflow-y-auto px-16 py-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Sparkles size={24} className="text-[#787774]" /> 解析インサイト
              </h2>

              {analysisResult ? (
                <div className="space-y-8">
                  {/* マクロサマリー（NotionのCallout風） */}
                  <div className="p-4 bg-[#f7f7f5] rounded border border-[#e9e9e7] flex items-start gap-3">
                    <BarChart2 className="text-[#787774] shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold mb-3">「{analysisResult.title}」のマクロ指標</h3>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                        {[
                          { label: '名詞', value: `${(analysisResult.macro_metrics.noun_ratio * 100).toFixed(1)}%` },
                          { label: '動詞', value: `${(analysisResult.macro_metrics.verb_ratio * 100).toFixed(1)}%` },
                          { label: '形容詞', value: `${(analysisResult.macro_metrics.adjective_ratio * 100).toFixed(1)}%` },
                          { label: '一人称', value: `${analysisResult.macro_metrics.first_person_count}回` },
                          { label: '二人称', value: `${analysisResult.macro_metrics.second_person_count}回` },
                          { label: '具象度', value: `${analysisResult.macro_metrics.concreteness_score}/4` },
                        ].map((m, i) => (
                          <div key={i}>
                            <div className="text-[11px] text-[#787774]">{m.label}</div>
                            <div className="font-semibold text-sm text-[#37352f]">{m.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* グラフ（NotionのBlock風） */}
                  {analysisResult.sections.length > 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-5 border border-[#e9e9e7] rounded">
                        <h4 className="text-sm font-semibold mb-4 text-[#787774]">感情極性の推移</h4>
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={getChartData()}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9e9e7" />
                            <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis domain={[-1, 1]} fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e9e9e7', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} />
                            <Line type="monotone" dataKey="感情極性" stroke="#37352f" strokeWidth={2} dot={{ r: 4, fill: '#37352f' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="p-5 border border-[#e9e9e7] rounded">
                        <h4 className="text-sm font-semibold mb-4 text-[#787774]">時間軸の推移</h4>
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={getChartData()}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9e9e7" />
                            <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis domain={[-1.5, 1.5]} ticks={[-1, 0, 1]} fontSize={11} tickLine={false} axisLine={false}
                              tickFormatter={(v) => v === -1 ? '過去' : v === 0 ? '現在' : '未来'} />
                            <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e9e9e7', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} />
                            <Line type="monotone" dataKey="時間軸" stroke="#9ca3af" strokeWidth={2} dot={{ r: 4, fill: '#9ca3af' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="p-5 border border-[#e9e9e7] rounded">
                        <h4 className="text-sm font-semibold mb-4 text-[#787774]">情報密度の推移</h4>
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={getChartData()}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9e9e7" />
                            <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e9e9e7', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} />
                            <Line type="monotone" dataKey="情報密度" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* セクション別詳細（トグルブロック風） */}
                  <div className="space-y-4">
                    {analysisResult.sections.map((sec: any, idx: number) => (
                      <div key={idx} className="border border-[#e9e9e7] rounded group">
                        <div className="bg-[#fbfbfa] px-4 py-3 border-b border-[#e9e9e7] flex items-center justify-between rounded-t">
                          <span className="font-semibold text-sm">{sec.section_name}</span>
                          <div className="flex gap-3 text-xs text-[#787774]">
                            <span className="flex items-center gap-1"><Clock size={12}/> {TIMELINE_LABELS[sec.timeline] || sec.timeline}</span>
                            <span>{sec.sentiment_score > 0 ? '😊' : sec.sentiment_score < 0 ? '😢' : '😐'} {sec.sentiment_score}</span>
                          </div>
                        </div>
                        <div className="p-4 flex gap-6 bg-white rounded-b">
                          {/* 散文比較パネル */}
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            {/* 元の歌詞 */}
                            <div className="bg-[#f7f7f5] p-3 rounded border border-[#e9e9e7]">
                              <h5 className="text-[10px] font-bold text-[#787774] mb-2 flex justify-between items-center">
                                <span>ORIGINAL LYRICS</span>
                                <span>情報密度: {sec.information_density?.toFixed(2)}</span>
                              </h5>
                              <div className="space-y-3 font-mono text-sm leading-relaxed">
                                {sec.lyrics_raw.split('\n').filter((l: string) => l.trim()).map((line: string, l_idx: number) => (
                                  <div key={l_idx} className="flex items-center gap-2">
                                    <span className="text-[#37352f] flex-1">{line}</span>
                                    <div className="flex flex-col gap-0.5 items-end">
                                      <div className="flex items-center gap-1">
                                        <span className="px-1 py-0.5 bg-white text-[#4b5563] rounded text-[10px] border border-[#e5e7eb]">{sec.mora_counts?.[l_idx]}音</span>
                                        <span className={`px-1 py-0.5 rounded text-[10px] font-bold border ${VOWEL_COLORS[sec.end_vowels?.[l_idx]] || 'bg-gray-50'}`}>{sec.end_vowels?.[l_idx]?.toUpperCase() || "?"}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* 翻訳された散文 */}
                            <div className="bg-[#fbfbfa] p-3 rounded border border-[#e9e9e7]">
                              <h5 className="text-[10px] font-bold text-[#787774] mb-2">PROSE TRANSLATION</h5>
                              <div className="text-sm text-[#37352f] leading-loose">
                                {sec.prose_translation || "（翻訳データなし）"}
                              </div>
                            </div>
                          </div>
                          
                          {/* レトリック（控えめなサイド情報として） */}
                          <div className="w-64 pl-4 border-l border-[#e9e9e7]">
                            <h4 className="text-xs font-semibold text-[#787774] mb-3">抽出レトリック</h4>
                            {sec.extracted_rhetoric?.length > 0 ? (
                              <div className="space-y-3">
                                {sec.extracted_rhetoric.map((r: any, r_idx: number) => (
                                  <div key={r_idx} className="text-xs">
                                    <span className="bg-[#efefed] text-[#37352f] px-1.5 py-0.5 rounded text-[10px] mr-1.5 font-bold">{r.type}</span>
                                    <span className="font-medium text-[#37352f]">{r.phrase}</span>
                                    <div className="text-[#787774] mt-1 leading-snug p-1.5 bg-[#fbfbfa] border border-[#e9e9e7] rounded">💡 {r.reason}</div>
                                  </div>
                                ))}
                              </div>
                            ) : <p className="text-xs text-[#9ca3af]">なし</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center border border-dashed border-[#e9e9e7] rounded text-[#787774] text-sm">
                  エディタで解析を実行すると、ここにインサイトが表示されます。
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- 総合DB タブ --- */}
        {activeTab === 'db' && (
          <div className="flex-1 overflow-y-auto px-16 py-12">
            <div className="max-w-5xl mx-auto">
              <div className="flex justify-between items-end mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Database size={24} className="text-[#787774]" /> 総合データベース
                </h2>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-2 border border-[#e9e9e7] rounded px-2 py-1">
                    <Search size={14} className="text-[#9ca3af]" />
                    <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}
                      className="bg-transparent border-none outline-none text-[#37352f] cursor-pointer">
                      <option value="">すべてのタグ</option>
                      <option value="like">👍 Like</option>
                      <option value="dislike">👎 Dislike</option>
                      <option value="neutral">😐 Neutral</option>
                    </select>
                  </div>
                  <button onClick={loadDbData} className="px-3 py-1.5 hover:bg-[#efefed] rounded transition-colors text-[#37352f]">
                    更新
                  </button>
                </div>
              </div>

              {dbLoading ? (
                <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-[#d4d4d2] border-t-[#37352f] rounded-full animate-spin"></div></div>
              ) : (
                <div className="space-y-8">
                  {/* 対応分析（散布図） */}
                  {scatterData.length > 0 && (
                    <div className="border border-[#e9e9e7] rounded p-5 bg-[#fbfbfa]">
                      <h3 className="text-sm font-semibold mb-1 text-[#37352f]">文体DNAマップ（対応分析）</h3>
                      <p className="text-[11px] text-[#787774] mb-4">X軸: 具象度（左:抽象的 ⇔ 右:具象的） ／ Y軸: 情報密度（下:低い ⇔ 上:高い）</p>
                      <ResponsiveContainer width="100%" height={250}>
                        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e9e9e7" />
                          <XAxis type="number" dataKey="x" name="具象度" domain={[1, 4]} fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis type="number" dataKey="y" name="情報密度" fontSize={11} tickLine={false} axisLine={false} />
                          <ZAxis type="category" dataKey="name" name="タイトル" />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '4px', border: '1px solid #e9e9e7', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', fontSize: '12px' }} />
                          <Scatter data={scatterData} shape="circle">
                            {scatterData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.tag === 'like' ? '#ef4444' : entry.tag === 'dislike' ? '#3b82f6' : '#9ca3af'} />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* テーブル (NotionのDatabase風) */}
                  <div className="border border-[#e9e9e7] rounded overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-[#787774] border-b border-[#e9e9e7] bg-[#fbfbfa]">
                        <tr>
                          <th className="px-4 py-3 font-medium">タイトル</th>
                          <th className="px-4 py-3 font-medium">アーティスト</th>
                          <th className="px-4 py-3 font-medium">名詞比率</th>
                          <th className="px-4 py-3 font-medium">具象度</th>
                          <th className="px-4 py-3 font-medium">タグ</th>
                          <th className="px-4 py-3 font-medium text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSongs.length > 0 ? allSongs.map((song, idx) => (
                          <tr key={idx} className="border-b border-[#e9e9e7] last:border-0 hover:bg-[#fbfbfa] transition-colors group">
                            <td className="px-4 py-3 font-medium flex items-center gap-2">
                              <Music size={14} className="text-[#d4d4d2]" /> {song.title}
                            </td>
                            <td className="px-4 py-3 text-[#787774]">{song.artist}</td>
                            <td className="px-4 py-3">{((song.noun_ratio || 0) * 100).toFixed(1)}%</td>
                            <td className="px-4 py-3">{song.concreteness_score}</td>
                            <td className="px-4 py-3">
                              <select 
                                value={song.evaluation_tag || 'like'}
                                onChange={(e) => handleUpdateTag(song.song_id, e.target.value)}
                                className="bg-transparent text-xs outline-none cursor-pointer p-1 hover:bg-[#efefed] rounded"
                              >
                                <option value="like">👍 Like</option>
                                <option value="dislike">👎 Dislike</option>
                                <option value="neutral">😐 Neutral</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => handleDeleteSong(song.song_id)} className="text-[#d4d4d2] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-[#9ca3af]">データがありません</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 平均値集計 */}
                  {stats && stats.count > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 text-[#787774]">統計（{stats.count}曲）</h3>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 text-sm">
                        {[
                          { label: '名詞', value: `${(stats.avg_noun_ratio * 100).toFixed(1)}%` },
                          { label: '動詞', value: `${(stats.avg_verb_ratio * 100).toFixed(1)}%` },
                          { label: '形容詞', value: `${(stats.avg_adjective_ratio * 100).toFixed(1)}%` },
                          { label: '一人称/曲', value: stats.avg_first_person_count },
                          { label: '二人称/曲', value: stats.avg_second_person_count },
                          { label: '具象度', value: stats.avg_concreteness_score },
                          { label: '総トークン', value: stats.avg_total_tokens },
                        ].map((m, i) => (
                          <div key={i} className="border border-[#e9e9e7] p-3 rounded">
                            <div className="text-[10px] text-[#787774] mb-1">{m.label}</div>
                            <div className="font-semibold">{m.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}



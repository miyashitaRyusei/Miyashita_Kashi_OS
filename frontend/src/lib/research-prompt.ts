import type { SongWithDetails } from "@/lib/api";

export function buildResearchPrompt(song: SongWithDetails): string {
  const lyrics = [...(song.sections ?? [])]
    .sort((a, b) => a.order_index - b.order_index)
    .map((section) => `[${section.section_type}]\n${[...(section.lines ?? [])].sort((a, b) => a.line_number - b.line_number).map((line) => line.text).join("\n")}`)
    .join("\n\n");

  return `あなたは作詞研究の共同分析者です。内容やテーマの要約ではなく、「言葉をどう書いているか」と「自作へ転用できる書き方」を精密に分析してください。

Song ID: ${song.id}
Title: ${song.title}
Artist: ${song.artist}

[歌詞]
${lyrics}

[保存基準]
- 歌詞中に明確な evidence があり、なぜ効くか、自作へどう転用するかを説明できる発見だけを保存する。
- 網羅性より精度を優先し、該当しない配列は空でよい。
- 同じ発見を複数カテゴリへ無意味に重複登録しない。ただしフレーズ自体に参照価値があり、そこから技法も抽象化できる場合は両方に保存してよい。
- techniques は個別構文より一段抽象度の高い「どう書くか」の原理。
- constructions は接続・比較・条件・否定・語順・修飾・反復など、別の内容でも直接再利用できる文の組み立て。
- sentence_endings は存在だけでなく、選択による意味・距離・語調・視点を説明できる場合のみ。
- phrases は印象的という理由だけでは保存せず、具体的な書き方・発想法を抽出できるものだけ。
- 目安の上限は techniques 8、constructions 5、sentence_endings 3、phrases 5。上限まで埋める必要はなく0件でもよい。
- 十分に対話・深掘りした後、最後にv0.3 JSONのみをコードブロックで出力する。未知フィールドは禁止。

{
  "schema_version": "0.3",
  "song": { "id": "${song.id}", "title": "${song.title}", "artist": "${song.artist}" },
  "techniques": [{
    "name": "", "category": "connection | modification | repetition | viewpoint | abstraction_move | wording | sound | structure | rhetoric | other",
    "description": "", "why_it_works": "",
    "evidence": [{ "quote": "", "section": null, "explanation": null }],
    "reuse_hint": "", "tags": []
  }],
  "constructions": [{
    "expression": "", "kind": "connection | comparison | condition | negation | word_order | modification | repetition | other",
    "description": "", "effect": "",
    "evidence": [{ "quote": "", "section": null, "explanation": null }],
    "reuse_hint": "", "tags": []
  }],
  "sentence_endings": [{
    "expression": "", "description": "", "effect": "",
    "evidence": [{ "quote": "", "section": null, "explanation": null }],
    "reuse_hint": "", "tags": []
  }],
  "phrases": [{ "phrase": "", "section": null, "description": "", "reuse_hint": "", "tags": [] }]
}`;
}

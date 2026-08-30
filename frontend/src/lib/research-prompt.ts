import type { SongWithDetails } from "@/lib/api";

export function buildResearchPrompt(song: SongWithDetails): string {
  const lyrics = [...(song.sections ?? [])]
    .sort((a, b) => a.order_index - b.order_index)
    .map((section) => {
      const lines = [...(section.lines ?? [])]
        .sort((a, b) => a.line_number - b.line_number)
        .map((line) => line.text)
        .join("\n");
      return `[${section.section_type}]\n${lines}`;
    })
    .join("\n\n");

  return `あなたは作詞研究の共同分析者です。以下の歌詞について、内容やテーマの要約ではなく「言葉をどう書いているか」と、自作へ転用できる書き方を対話的に分析してください。

楽曲ID: ${song.id}
タイトル: ${song.title}
アーティスト: ${song.artist}

【歌詞】
${lyrics}

【分析方針】
- テーマ説明より、接続・修飾・反復・視点・抽象具体の移動・語感・音韻・構造・レトリックを優先する
- 曖昧な一般論を避け、techniquesには歌詞中のevidenceを最低1件付ける
- sentence_endings / connections / modifiersを登録する場合もevidenceを最低1件付ける
- motifsは具体語のネットワークと展開が明確な場合のみ抽出し、elementsを最低1件付ける
- takeawaysは0〜5件。本当に転用価値があるものだけにする
- 元歌詞の表面的な模倣を避ける方法をavoid_copyingへ書く
- 該当しない項目は空配列または空文字列でよく、項目を埋めることを目的にしない
- summaryだけに新しい発見を書かず、実例→原理→転用の対応を保つ

十分に対話・深掘りした後、最後に次のv0.2仕様へ厳密に一致するJSONのみをコードブロックで出力してください。未知のフィールドは追加しないでください。

{
  "schema_version": "0.2",
  "song": { "id": "${song.id}", "title": "${song.title}", "artist": "${song.artist}" },
  "summary": { "overview": "", "key_insights": [] },
  "techniques": [{
    "name": "", "category": "connection | modification | repetition | viewpoint | abstraction_move | wording | sound | structure | rhetoric | other",
    "description": "", "why_it_works": "",
    "evidence": [{ "quote": "", "section": null, "explanation": null }],
    "reuse_hint": "", "tags": []
  }],
  "expression_patterns": {
    "sentence_endings": [{ "expression": "", "description": "", "effect": "", "evidence": [{ "quote": "", "section": null, "explanation": null }], "reuse_hint": "", "tags": [] }],
    "connections": [],
    "modifiers": [],
    "notable_phrases": [{ "phrase": "", "section": null, "description": "", "reuse_hint": "", "tags": [] }]
  },
  "motifs": [{
    "name": "", "elements": [{ "text": "", "section": null, "note": null }],
    "development": "", "shared_principle": "", "function": ""
  }],
  "structure": { "overview": "", "repetition_and_variation": "", "viewpoint_flow": "", "abstract_concrete_flow": "" },
  "takeaways": [{ "title": "", "description": "", "how_to_use": "", "avoid_copying": "" }]
}`;
}

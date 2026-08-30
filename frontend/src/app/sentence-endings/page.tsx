import ResearchDictionaryPage from "@/components/research/ResearchDictionaryPage";
const TYPES = ["sentence_ending"] as const;
export default function SentenceEndingsPage() { return <ResearchDictionaryPage title="文末表現" description="文末の選択によって生まれる意味・距離・語調・視点を、自作への効果とともに引く辞典。" itemTypes={[...TYPES]} />; }

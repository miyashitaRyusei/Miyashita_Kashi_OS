import ResearchDictionaryPage from "@/components/research/ResearchDictionaryPage";
const TYPES = ["technique"] as const;
export default function TechniquesPage() { return <ResearchDictionaryPage title="作詞技法" description="具体的な証拠から抽象化された、別の歌詞にも転用できる書き方の原理。" itemTypes={[...TYPES]} categoryLabel="Category" />; }

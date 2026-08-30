import ResearchDictionaryPage from "@/components/research/ResearchDictionaryPage";
const TYPES = ["connection", "modifier"] as const;
export default function ConstructionsPage() { return <ResearchDictionaryPage title="構文・接続" description="接続・比較・条件・否定・語順・修飾など、内容を替えて直接再利用できる文の組み立て。" itemTypes={[...TYPES]} />; }

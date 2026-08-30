import ResearchDictionaryPage from "@/components/research/ResearchDictionaryPage";
const TYPES = ["notable_phrase"] as const;
export default function PhrasesPage() { return <ResearchDictionaryPage title="フレーズ" description="表面的な綺麗さではなく、語の選び方や圧縮・具体化・音など、自作へ応用できる発想を含むフレーズ。" itemTypes={[...TYPES]} />; }

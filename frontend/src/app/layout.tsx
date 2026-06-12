import type { Metadata } from "next";
import { Zen_Kaku_Gothic_New } from "next/font/google";
import Sidebar from "@/components/layout/Sidebar";
import "./globals.css";

const zenKakuGothic = Zen_Kaku_Gothic_New({
  weight: ['400', '500', '700', '900'],
  subsets: ["latin"],
  variable: "--font-zen-kaku",
});

export const metadata: Metadata = {
  title: "みやした歌詞OS",
  description: "計量的文体論 x LLM 模倣的作詞支援システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${zenKakuGothic.variable} h-full antialiased`}
    >
      <body className={`h-full flex flex-col md:flex-row bg-white text-[#37352f] ${zenKakuGothic.className}`}>
        <Sidebar />
        <main className="flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}

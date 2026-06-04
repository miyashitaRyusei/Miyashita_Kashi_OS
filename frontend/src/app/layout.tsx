import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/layout/Sidebar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex bg-white text-[#37352f]">
        <Sidebar />
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}

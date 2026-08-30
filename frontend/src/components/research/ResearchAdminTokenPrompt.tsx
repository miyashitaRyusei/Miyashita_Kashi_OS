"use client";

import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";

export default function ResearchAdminTokenPrompt({
  onSubmit,
}: {
  onSubmit: (token: string) => void;
}) {
  const [value, setValue] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    onSubmit(value);
    setValue("");
  };

  return (
    <form onSubmit={submit} className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex items-start gap-3">
        <KeyRound size={17} className="mt-0.5 text-amber-700" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-amber-900">研究分析を利用するには管理トークンが必要です</p>
          <p className="mt-1 text-[10px] leading-relaxed text-amber-800">トークンはこのブラウザタブのsessionStorageだけに保持され、ブラウザを閉じると再入力が必要です。</p>
          <div className="mt-3 flex gap-2">
            <input
              type="password"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              autoComplete="off"
              aria-label="研究分析管理トークン"
              className="min-w-0 flex-1 rounded-md border border-amber-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-amber-400"
            />
            <button type="submit" disabled={!value.trim()} className="rounded-md bg-amber-700 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40">設定</button>
          </div>
        </div>
      </div>
    </form>
  );
}

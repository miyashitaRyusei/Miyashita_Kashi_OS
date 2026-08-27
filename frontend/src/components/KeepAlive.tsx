"use client";

import { useEffect } from "react";
import { pingHealthCheck } from "@/lib/api";

export default function KeepAlive() {
  useEffect(() => {
    // 初回マウント時
    pingHealthCheck();

    // 5分（300000ms）おきにpingを送信してサーバーのスリープを防ぐ
    const intervalId = setInterval(() => {
      pingHealthCheck();
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  return null; // UIには何も表示しない
}

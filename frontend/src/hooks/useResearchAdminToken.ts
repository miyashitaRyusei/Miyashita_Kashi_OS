"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "miyashita-research-admin-token";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return window.sessionStorage.getItem(STORAGE_KEY) ?? "";
}

function getServerSnapshot() {
  return "";
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function useResearchAdminToken() {
  const token = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const saveToken = useCallback((value: string) => {
    const normalized = value.trim();
    if (normalized) window.sessionStorage.setItem(STORAGE_KEY, normalized);
    else window.sessionStorage.removeItem(STORAGE_KEY);
    notifyListeners();
  }, []);

  const clearToken = useCallback(() => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    notifyListeners();
  }, []);

  return { token, ready: true, saveToken, clearToken };
}

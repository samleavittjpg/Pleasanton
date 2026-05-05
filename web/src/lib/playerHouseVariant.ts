"use client";

import { useSyncExternalStore } from "react";
import type { HouseVariantId } from "./houseCatalog";
import { HOUSE_VARIANTS } from "./houseCatalog";

const STORAGE_KEY = "pleasantonHouseVariant";

const listeners = new Set<() => void>();

function readStoredVariant(): HouseVariantId | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const ok = HOUSE_VARIANTS.some((v) => v.id === raw);
  return ok ? (raw as HouseVariantId) : null;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): HouseVariantId | null {
  return readStoredVariant();
}

function getServerSnapshot(): HouseVariantId | null {
  return null;
}

export function setPlayerHouseVariant(id: HouseVariantId | null) {
  if (id === null) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, id);
  listeners.forEach((l) => l());
}

export function usePlayerHouseVariant() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

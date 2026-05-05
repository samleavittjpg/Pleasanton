"use client";

import Link from "next/link";
import { HouseColorPicker } from "../../components/neighborhood/HouseColorPicker";
import { IsoWorldMap } from "../../components/iso/IsoWorldMap";
import type { HouseVariantId } from "../../lib/houseCatalog";
import { houseVariantLabel } from "../../lib/houseCatalog";
import { setPlayerHouseVariant, usePlayerHouseVariant } from "../../lib/playerHouseVariant";

export default function NeighborhoodPage() {
  const variant = usePlayerHouseVariant();

  const handleChoose = (id: HouseVariantId) => {
    setPlayerHouseVariant(id);
  };

  const handleClearVariant = () => {
    setPlayerHouseVariant(null);
  };

  return (
    <div
      className={
        variant
          ? "flex h-screen flex-col bg-zinc-950 text-zinc-100"
          : "relative flex h-screen flex-col overflow-hidden bg-gradient-to-b from-sky-300 via-sky-400 to-sky-500 text-zinc-100"
      }
    >
      {variant && (
        <header className="z-40 flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur-sm">
          <div>
            <h1 className="text-sm uppercase tracking-wide text-zinc-100">Pleasanton</h1>
            <p className="text-[10px] text-zinc-500">{houseVariantLabel(variant)} · scroll to explore</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-none border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-[10px] uppercase text-zinc-300 hover:bg-zinc-800"
              onClick={handleClearVariant}
            >
              Change color
            </button>
            <Link
              href="/create-match"
              className="rounded-none border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-[10px] uppercase text-zinc-200 hover:bg-zinc-700"
            >
              Lobby
            </Link>
          </div>
        </header>
      )}

      <div className="min-h-0 flex-1">{!variant ? <HouseColorPicker onChoose={handleChoose} /> : <IsoWorldMap playerVariantId={variant} />}</div>
    </div>
  );
}


"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import type { HouseVariantId } from "../../lib/houseCatalog";
import { getHouseVariant, HOUSE_VARIANTS } from "../../lib/houseCatalog";
import { BOARD_PADS } from "../../lib/boardPads";
import { buildDefaultWorld, CENTER_COL, CENTER_ROW } from "../../lib/worldMap";

type Props = {
  playerVariantId: HouseVariantId;
};

type PlacedHouse = {
  id: string;
  src: string;
  x: number;
  y: number;
  scale: number;
  kind: "base" | "mid" | "full";
};

// This map is intentionally minimal: just the neighborhood pad tile and houses.
const WORLD_W = 2600;
const WORLD_H = 1800;
const DEBUG_PADS = false;
const HOUSE_SCALE = 0.38;
// Move sprites vertically in pixels (obvious + reliable).
const HOUSE_OFFSET_Y_PX = -150;
const DEBUG_HOUSE_ANCHOR = false;
type Pad = { x: number; y: number; scale: number };
// Bring pads closer together on the board (1.0 = exact baked positions).
const PAD_CONTRACT = 0.75;

function getPads(): Pad[] {
  const pads: Pad[] = BOARD_PADS.map((p) => ({ ...p, scale: HOUSE_SCALE }));
  const center = pads[4]!;
  if (PAD_CONTRACT >= 0.999) return pads;
  return pads.map((p, i) => {
    if (i === 4) return p;
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return { ...p, x: center.x + dx * PAD_CONTRACT, y: center.y + dy * PAD_CONTRACT };
  });
}

export function IsoWorldMap({ playerVariantId }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);

  const scene = useMemo(() => {
    const grid = buildDefaultWorld(playerVariantId);
    // Render multiple boards: the same 3x3 ownership layout, each board uses the same 9 pad anchors.
    const boards: Array<{
      id: string;
      ownerLabel: string;
      variantId: HouseVariantId;
      isPlayer: boolean;
      x: number;
      y: number;
      houses: PlacedHouse[];
    }> = [];

    // Bring boards close enough that their black borders overlap,
    // which reads as continuous streets between neighborhoods.
    const stepX = 410;
    const stepY = 300;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r]!.length; c++) {
        const cell = grid[r]![c]!;
        const isPlayer = r === CENTER_ROW && c === CENTER_COL;
        // Isometric-ish board placement (diamond grid of boards).
        const x = 820 + (c - r) * stepX;
        const y = 260 + (c + r) * stepY;
        boards.push({
          id: cell.id,
          ownerLabel: cell.ownerLabel,
          variantId: cell.variantId,
          isPlayer,
          x,
          y,
          houses: buildBoardHouses(cell.variantId),
        });
      }
    }
    return { boards };
  }, [playerVariantId]);

  useEffect(() => {
    const s = scrollRef.current;
    const c = centerRef.current;
    if (!s || !c) return;
    requestAnimationFrame(() => {
      s.scrollTo({
        left: c.offsetLeft + c.offsetWidth / 2 - s.clientWidth / 2,
        top: c.offsetTop + c.offsetHeight / 2 - s.clientHeight / 2,
        behavior: "auto",
      });
    });
  }, [playerVariantId]);

  return (
    <div ref={scrollRef} className="h-full w-full overflow-auto bg-zinc-900">
      <div
        className="relative"
        style={{
          width: `${WORLD_W}px`,
          height: `${WORLD_H}px`,
        }}
      >
        {scene.boards.map((b) => (
          <div
            key={b.id}
            ref={b.isPlayer ? centerRef : undefined}
            className="absolute"
            style={{ left: `${b.x}px`, top: `${b.y}px` }}
          >
            <Board
              ownerLabel={b.ownerLabel}
              variantId={b.variantId}
              isPlayer={b.isPlayer}
              houses={b.houses}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function buildBoardHouses(variantId: HouseVariantId): PlacedHouse[] {
  const suffix = variantId.charAt(0).toUpperCase() + variantId.slice(1);
  const base = `/houses/Base_House_${suffix}.png`;
  const pads = getPads();

  return pads
    .map((p, i) => ({
      id: `board-${variantId}-${i}`,
      src: base,
      x: p.x,
      y: p.y,
      scale: p.scale,
      kind: "base" as const,
    }));
}

function Board({ ownerLabel, variantId, isPlayer, houses }: { ownerLabel: string; variantId: HouseVariantId; isPlayer: boolean; houses: PlacedHouse[] }) {
  const v = getHouseVariant(variantId) ?? HOUSE_VARIANTS[0]!;
  return (
    <div className="relative" style={{ width: 900, height: 900 }}>
      <Image
        alt=""
        src="/Neighborhood.png"
        width={900}
        height={900}
        priority={isPlayer}
        unoptimized
        className="relative z-0 [image-rendering:pixelated]"
      />
      <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
        <span className="border border-zinc-800/80 bg-zinc-950/70 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-200">
          {ownerLabel}
        </span>
        {isPlayer && (
          <span className="border border-amber-300/60 bg-amber-200/10 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-200">
            you
          </span>
        )}
        <span
          className="h-2.5 w-2.5 border border-white/20"
          style={{ background: v.accentRgb }}
          aria-hidden
        />
      </div>

      <div className="absolute inset-0 z-10 overflow-hidden">
        <BoardHouses houses={houses} />
      </div>
    </div>
  );
}

function BoardHouses({ houses }: { houses: PlacedHouse[] }) {
  return (
    <div className="absolute left-0 top-0">
      {DEBUG_HOUSE_ANCHOR && (
        <div className="absolute left-0 top-0 z-20 h-full w-full pointer-events-none">
          <div className="absolute left-0 right-0 border-t-2 border-amber-300/80" style={{ top: `${450}px` }} />
        </div>
      )}
      {DEBUG_PADS &&
        getPads().map((p, i) => (
          <div
            key={`pad-${i}`}
            className="absolute h-3 w-3 rounded-full bg-fuchsia-400"
            style={{ left: `${p.x}px`, top: `${p.y}px`, transform: "translate(-50%, -50%)" }}
            title={`pad ${i}`}
          />
        ))}

      {houses.map((h) => (
        <div
          key={h.id}
          className="absolute"
          style={{
            left: `${h.x}px`,
            top: `${h.y + HOUSE_OFFSET_Y_PX}px`,
            zIndex: 10,
            transform: "translate(-50%, -50%)",
            transformOrigin: "50% 50%",
          }}
        >
          <div
            className="relative"
            style={{
              width: `${Math.round(512 * h.scale)}px`,
              height: `${Math.round(512 * h.scale)}px`,
              backgroundImage: `url(${h.src})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "contain",
              imageRendering: "pixelated",
              transform: "rotate(-1.2deg)",
              filter: "drop-shadow(0 12px 0 rgba(0,0,0,0.35))",
            }}
          />
        </div>
      ))}
    </div>
  );
}


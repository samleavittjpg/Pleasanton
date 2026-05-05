"use client";

import { useEffect, useMemo, useRef } from "react";
import type { HouseVariantId } from "../../lib/houseCatalog";
import { getHouseVariant } from "../../lib/houseCatalog";
import { buildDefaultWorld, CENTER_COL, CENTER_ROW, npcSlotSrcs, playerSlotSrcs } from "../../lib/worldMap";
import { NeighborhoodBlock } from "./NeighborhoodBlock";

type Props = {
  playerVariantId: HouseVariantId;
};

const TILE_W = 300;
const TILE_H = 190;
const GAP = 56;

export function WorldMap({ playerVariantId }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);

  const grid = buildDefaultWorld(playerVariantId);

  const positioned = useMemo(() => {
    // Isometric placement:
    // x = (c - r) * stepX
    // y = (c + r) * stepY
    const stepX = (TILE_W + GAP) / 2;
    const stepY = (TILE_H + GAP) / 2;
    const cells: Array<{ r: number; c: number; x: number; y: number }> = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r]!.length; c++) {
        cells.push({ r, c, x: (c - r) * stepX, y: (c + r) * stepY });
      }
    }
    const xs = cells.map((p) => p.x);
    const ys = cells.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = 220;
    return {
      cells,
      minX,
      minY,
      width: maxX - minX + TILE_W + pad * 2,
      height: maxY - minY + TILE_H + pad * 2,
      pad,
      stepX,
      stepY,
    };
  }, [grid]);

  useEffect(() => {
    const s = scrollRef.current;
    const c = centerRef.current;
    if (!s || !c) return;
    // Center the scroll view on the player's neighborhood.
    const frame = () => {
      const left = c.offsetLeft + c.offsetWidth / 2 - s.clientWidth / 2;
      const top = c.offsetTop + c.offsetHeight / 2 - s.clientHeight / 2;
      s.scrollTo({ left, top, behavior: "auto" });
    };
    requestAnimationFrame(frame);
  }, [playerVariantId]);

  return (
    <div ref={scrollRef} className="h-full w-full overflow-auto bg-zinc-700">
      <div
        className="relative"
        style={{
          width: `${positioned.width}px`,
          height: `${positioned.height}px`,
          background:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.06) 0 2px, transparent 2px), radial-gradient(circle at 75% 65%, rgba(255,255,255,0.05) 0 2px, transparent 2px)",
        }}
      >
        {positioned.cells.map(({ r, c, x, y }) => {
          const cell = grid[r]![c]!;
          const v = getHouseVariant(cell.variantId);
          if (!v) return null;

          const baseSrc = v.baseSrc;
          const slots = r === CENTER_ROW && c === CENTER_COL ? playerSlotSrcs(baseSrc) : npcSlotSrcs(baseSrc, r, c);
          const isPlayer = r === CENTER_ROW && c === CENTER_COL;

          const node = (
            <NeighborhoodBlock variant={v} ownerLabel={cell.ownerLabel} highlight={isPlayer} slotSrcs={slots} />
          );

          return (
            <div
              key={cell.id}
              ref={isPlayer ? centerRef : undefined}
              className="absolute"
              style={{
                left: `${x - positioned.minX + positioned.pad}px`,
                top: `${y - positioned.minY + positioned.pad}px`,
              }}
            >
              {node}
            </div>
          );
        })}
      </div>
    </div>
  );
}

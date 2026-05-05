"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HouseVariantId } from "../../lib/houseCatalog";
import { getHouseVariant, HOUSE_VARIANTS } from "../../lib/houseCatalog";
import { BOARD_PADS } from "../../lib/boardPads";
import { buildDefaultWorld, CENTER_COL, CENTER_ROW } from "../../lib/worldMap";
import { HouseInfoModal, type HouseFamilyInfo } from "../house/HouseInfoModal";

type Props = {
  playerVariantId: HouseVariantId;
};

type PlacedHouse = {
  id: string;
  src: string;
  x: number; // world space
  y: number; // world space
  scale: number;
  kind: "base" | "mid" | "full";
  padIndex: number;
  boardId: string;
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
const HOUSE_ROT_DEG = -1.2;

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
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const [didDrag, setDidDrag] = useState(false);

  const [selected, setSelected] = useState<{
    houseSrc: string;
    family: HouseFamilyInfo;
  } | null>(null);

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
    const allHouses: PlacedHouse[] = [];

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
        const houses = buildBoardHouses(cell.id, cell.variantId, x, y);
        boards.push({
          id: cell.id,
          ownerLabel: cell.ownerLabel,
          variantId: cell.variantId,
          isPlayer,
          x,
          y,
          houses,
        });
        allHouses.push(...houses);
      }
    }
    return { boards, allHouses };
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
    <div
      ref={scrollRef}
      className="h-full w-full overflow-auto bg-zinc-900"
      style={{ cursor: didDrag ? "grabbing" : "grab" }}
      onPointerDown={(e) => {
        const el = scrollRef.current;
        if (!el) return;
        if (selected) return;
        // If clicking on a house button, let it handle the click.
        const target = e.target as HTMLElement;
        if (target.closest("[data-house-button='1']")) return;

        dragRef.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          startLeft: el.scrollLeft,
          startTop: el.scrollTop,
        };
        setDidDrag(false);
        el.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const el = scrollRef.current;
        const d = dragRef.current;
        if (!el || !d || d.pointerId !== e.pointerId) return;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (!didDrag && Math.hypot(dx, dy) > 4) setDidDrag(true);
        if (!didDrag && Math.hypot(dx, dy) <= 4) return;
        el.scrollLeft = d.startLeft - dx;
        el.scrollTop = d.startTop - dy;
      }}
      onPointerUp={(e) => {
        const el = scrollRef.current;
        const d = dragRef.current;
        if (!el || !d || d.pointerId !== e.pointerId) return;
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        dragRef.current = null;
        setTimeout(() => setDidDrag(false), 0);
      }}
      onPointerCancel={(e) => {
        const el = scrollRef.current;
        const d = dragRef.current;
        if (!el || !d || d.pointerId !== e.pointerId) return;
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        dragRef.current = null;
        setDidDrag(false);
      }}
    >
      <div
        className="relative"
        style={{
          width: `${WORLD_W}px`,
          height: `${WORLD_H}px`,
        }}
      >
        {/* Layer 1: all boards. Pointer-events disabled so they never block houses. */}
        <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
          {scene.boards.map((b) => (
            <div
              key={b.id}
              ref={b.isPlayer ? centerRef : undefined}
              className="absolute"
              style={{ left: `${b.x}px`, top: `${b.y}px`, width: 900, height: 900 }}
            >
              <Image
                alt=""
                src="/Neighborhood.png"
                width={900}
                height={900}
                priority={b.isPlayer}
                unoptimized
                className="[image-rendering:pixelated]"
              />

              {/* Labels are visual-only, also non-interactive */}
              <div className="absolute left-3 top-3 z-20 flex items-center gap-2 pointer-events-none">
                <span className="border border-zinc-800/80 bg-zinc-950/70 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-200">
                  {b.ownerLabel}
                </span>
                {b.isPlayer && (
                  <span className="border border-amber-300/60 bg-amber-200/10 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-200">
                    you
                  </span>
                )}
                <span
                  className="h-2.5 w-2.5 border border-white/20"
                  style={{ background: (getHouseVariant(b.variantId) ?? HOUSE_VARIANTS[0]!).accentRgb }}
                  aria-hidden
                />
              </div>
            </div>
          ))}
        </div>

        {/* Layer 2: all houses above all boards. */}
        <div className="absolute inset-0 z-30">
          <MapHouses
            houses={scene.allHouses}
            isPanning={() => didDrag}
            onHouseClick={(houseSrc, family) => setSelected({ houseSrc, family })}
          />
        </div>
      </div>

      <HouseInfoModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        houseSrc={selected?.houseSrc ?? ""}
        family={
          selected?.family ?? {
            lastName: "—",
            dailyMoneyContribution: 0,
            dailyAvgTrash: 0,
            complaintsPerWeek: 0,
            notes: "",
          }
        }
      />
    </div>
  );
}

function buildBoardHouses(boardId: string, variantId: HouseVariantId, boardX: number, boardY: number): PlacedHouse[] {
  const suffix = variantId.charAt(0).toUpperCase() + variantId.slice(1);
  const base = `/houses/Base_House_${suffix}.png`;
  const pads = getPads();

  return pads
    .map((p, i) => ({
      id: `board-${boardId}-${variantId}-${i}`,
      src: base,
      x: boardX + p.x,
      y: boardY + p.y,
      scale: p.scale,
      kind: "base" as const,
      padIndex: i,
      boardId,
    }));
}

function MapHouses({
  houses,
  onHouseClick,
  isPanning,
}: {
  houses: PlacedHouse[];
  onHouseClick: (houseSrc: string, family: HouseFamilyInfo) => void;
  isPanning: () => boolean;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoverRaf = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoveredRef = useRef<string | null>(null);
  hoveredRef.current = hoveredId;

  // Cache decoded image alpha per src.
  const alphaCache = useRef(
    new Map<
      string,
      Promise<{
        width: number;
        height: number;
        data: Uint8ClampedArray;
      }>
    >()
  );

  const getAlphaData = (src: string) => {
    const cached = alphaCache.current.get(src);
    if (cached) return cached;
    const p = (async () => {
      const res = await fetch(src);
      const blob = await res.blob();
      const bmp = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2d context not available");
      ctx.drawImage(bmp, 0, 0);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return { width: img.width, height: img.height, data: img.data };
    })();
    alphaCache.current.set(src, p);
    return p;
  };

  function hitTestHousePixel(h: PlacedHouse, localX: number, localY: number) {
    // Convert board-local mouse coords into house-local box coords (before translate(-50%,-50%)).
    const size = Math.round(512 * h.scale);
    const left = h.x - size / 2;
    const top = h.y + HOUSE_OFFSET_Y_PX - size / 2;
    const x = localX - left;
    const y = localY - top;
    if (x < 0 || y < 0 || x >= size || y >= size) return Promise.resolve(false);

    // Undo the small visual rotation so hit testing matches what you see.
    const angle = (-HOUSE_ROT_DEG * Math.PI) / 180; // inverse rotation
    const cx = size / 2;
    const cy = size / 2;
    const dx = x - cx;
    const dy = y - cy;
    const rx = dx * Math.cos(angle) - dy * Math.sin(angle) + cx;
    const ry = dx * Math.sin(angle) + dy * Math.cos(angle) + cy;
    if (rx < 0 || ry < 0 || rx >= size || ry >= size) return Promise.resolve(false);

    return getAlphaData(h.src).then(({ width, height, data }) => {
      const px = Math.floor((rx / size) * width);
      const py = Math.floor((ry / size) * height);
      const idx = (py * width + px) * 4 + 3;
      const a = data[idx] ?? 0;
      return a > 10;
    });
  }

  const scheduleHoverUpdate = (clientX: number, clientY: number) => {
    if (hoverRaf.current != null) cancelAnimationFrame(hoverRaf.current);
    hoverRaf.current = requestAnimationFrame(async () => {
      const root = containerRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Check topmost-first by "depth" (y) so foreground wins.
      const sorted = [...houses].sort((a, b) => (b.y - a.y) || b.padIndex - a.padIndex);
      for (const h of sorted) {
        // eslint-disable-next-line no-await-in-loop
        const hit = await hitTestHousePixel(h, x, y);
        if (hit) {
          if (hoveredRef.current !== h.id) setHoveredId(h.id);
          return;
        }
      }
      if (hoveredRef.current !== null) setHoveredId(null);
    });
  };

  useEffect(() => {
    return () => {
      if (hoverRaf.current != null) cancelAnimationFrame(hoverRaf.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute left-0 top-0"
      onPointerMove={(e) => scheduleHoverUpdate(e.clientX, e.clientY)}
      onPointerLeave={() => setHoveredId(null)}
      onPointerDown={(e) => {
        // If clicking on a house pixel (not just the bounding box), open the modal.
        // We reuse the hoveredId calculated by hit-testing.
        const id = hoveredRef.current;
        if (!id) return;
        if (isPanning()) return;
        const h = houses.find((x) => x.id === id);
        if (!h) return;
        onHouseClick(h.src, familyForHouse(h.boardId, h.padIndex));
        e.preventDefault();
      }}
      style={{ touchAction: "none" }}
    >
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
          data-house-button="1"
          className="absolute"
          style={{
            left: `${h.x}px`,
            top: `${h.y + HOUSE_OFFSET_Y_PX}px`,
            // Keep a stable depth order for visuals; hover/click uses pixel hit-test.
            zIndex: 10 + Math.round(h.y),
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
              transform: `rotate(${HOUSE_ROT_DEG}deg)`,
              filter:
                hoveredId === h.id
                  ? "drop-shadow(0 12px 0 rgba(0,0,0,0.35)) drop-shadow(1px 0 0 rgba(255,255,255,0.95)) drop-shadow(-1px 0 0 rgba(255,255,255,0.95)) drop-shadow(0 1px 0 rgba(255,255,255,0.95)) drop-shadow(0 -1px 0 rgba(255,255,255,0.95))"
                  : "drop-shadow(0 12px 0 rgba(0,0,0,0.35))",
              pointerEvents: "none",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function familyForHouse(boardId: string, padIndex: number): HouseFamilyInfo {
  const lastNames = [
    "Nguyen",
    "Garcia",
    "Patel",
    "Kim",
    "Smith",
    "Johnson",
    "Martinez",
    "Chen",
    "Brown",
    "Davis",
    "Lopez",
    "Singh",
  ];
  const seed = hash(`${boardId}:${padIndex}`);
  const lastName = lastNames[seed % lastNames.length]!;
  const dailyMoneyContribution = 50 + (seed % 200);
  const dailyAvgTrash = ((seed % 35) / 10) * 2; // 0..7.0
  const complaintsPerWeek = seed % 6; // 0..5
  const notes =
    complaintsPerWeek >= 4
      ? "Repeated violations: trash bins visible from street. Neighbor reports loud leaf blower usage."
      : dailyAvgTrash > 4
        ? "Occasional overflow on pickup day. Recommend a warning letter."
        : "Mostly compliant. Lawn edges could be sharper.";

  return { lastName, dailyMoneyContribution, dailyAvgTrash, complaintsPerWeek, notes };
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

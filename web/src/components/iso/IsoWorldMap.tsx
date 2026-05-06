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
  outline: string;
  isPlayerTeam: boolean;
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
// Population tuning
const FILL_RATE = 0.62; // fraction of pads that get a house
const LEVEL_WEIGHTS: Array<{ kind: PlacedHouse["kind"]; w: number; scaleMul: number }> = [
  { kind: "base", w: 0.55, scaleMul: 0.96 },
  { kind: "mid", w: 0.30, scaleMul: 1.02 },
  { kind: "full", w: 0.15, scaleMul: 1.08 },
];

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
        const houses = buildBoardHouses(cell.id, cell.variantId, x, y, isPlayer);
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
                loading={b.isPlayer ? "eager" : "lazy"}
                fetchPriority={b.isPlayer ? "high" : "auto"}
                unoptimized
                className="[image-rendering:pixelated]"
                style={{ width: "auto", height: "auto" }}
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

function buildBoardHouses(
  boardId: string,
  variantId: HouseVariantId,
  boardX: number,
  boardY: number,
  isPlayerTeam: boolean,
): PlacedHouse[] {
  const suffix = variantId.charAt(0).toUpperCase() + variantId.slice(1);
  const srcByKind: Record<PlacedHouse["kind"], string> = {
    base: `/houses/Base_House_${suffix}.png`,
    mid: `/houses/Mid_House_${suffix}.png`,
    full: `/houses/Full_House_${suffix}.png`,
  };
  const accent = (getHouseVariant(variantId) ?? HOUSE_VARIANTS[0]!).accentRgb;
  const outline = brightenHex(accent, 0.55);

  const pads = getPads();
  const houses: PlacedHouse[] = [];

  for (let i = 0; i < pads.length; i++) {
    const p = pads[i]!;
    const rng = makeRng(`${boardId}:${variantId}:${i}`);
    if (rng() > FILL_RATE) continue;

    const pick = weightedPick(LEVEL_WEIGHTS, rng);
    houses.push({
      id: `board-${boardId}-${variantId}-${i}`,
      src: srcByKind[pick.kind],
      x: boardX + p.x,
      y: boardY + p.y,
      scale: p.scale * pick.scaleMul,
      kind: pick.kind,
      padIndex: i,
      boardId,
      outline,
      isPlayerTeam,
    });
  }

  return houses;
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
  const [trashPileClicks, setTrashPileClicks] = useState<Record<string, number>>({});
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: -9999, y: -9999 });
  const hoverRaf = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoveredRef = useRef<string | null>(null);
  hoveredRef.current = hoveredId;
  const hoveredHouse = hoveredId ? houses.find((x) => x.id === hoveredId) ?? null : null;
  const hoveredClicksDone = hoveredHouse ? (trashPileClicks[hoveredHouse.id] ?? 0) : 0;
  const hoveredRequiredClicks = hoveredHouse ? trashPileClicksRequired(hoveredHouse.id) : 0;
  const hoveredActivePile =
    hoveredHouse && hoveredHouse.isPlayerTeam
      ? houseTrashPileFor(hoveredHouse, hoveredClicksDone >= hoveredRequiredClicks)
      : null;
  const broomCursor = hoveredClicksDone % 2 === 0 ? "/Icons/broom1.png" : "/Icons/broom2.png";

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
        const clicksDone = trashPileClicks[h.id] ?? 0;
        const requiredClicks = trashPileClicksRequired(h.id);
        const activePile = h.isPlayerTeam && houseTrashPileFor(h, clicksDone >= requiredClicks);
        if (activePile) {
          setTrashPileClicks((prev) => ({ ...prev, [h.id]: (prev[h.id] ?? 0) + 1 }));
          e.preventDefault();
          return;
        }
        onHouseClick(h.src, familyForHouse(h.boardId, h.padIndex));
        e.preventDefault();
      }}
      style={{
        touchAction: "none",
        cursor: hoveredActivePile ? "none" : undefined,
      }}
      onMouseMove={(e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
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
        (() => {
          const clicksDone = trashPileClicks[h.id] ?? 0;
          const requiredClicks = trashPileClicksRequired(h.id);
          const activePile = houseTrashPileFor(h, h.isPlayerTeam ? clicksDone >= requiredClicks : false);
          return (
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
              transform: `rotate(${HOUSE_ROT_DEG}deg)`,
              pointerEvents: "none",
            }}
          >
            {hoveredId === h.id ? (
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: h.outline,
                  // Use the sprite itself as a mask, then slightly scale up for a clean outline.
                  WebkitMaskImage: `url(${h.src})`,
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  WebkitMaskSize: "contain",
                  maskImage: `url(${h.src})`,
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                  maskSize: "contain",
                  transform: "scale(1.06)",
                  transformOrigin: "50% 50%",
                  opacity: 0.98,
                }}
              />
            ) : null}

            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${h.src})`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "contain",
                imageRendering: "pixelated",
              }}
            />

            <>
              {houseBinsFor(h).map((bin, idx) => (
                <div
                  key={`bin-${h.id}-${idx}`}
                  className="absolute"
                  style={{
                    left: `${Math.round(bin.x * h.scale)}px`,
                    top: `${Math.round(bin.y * h.scale)}px`,
                    width: `${Math.round(bin.w * h.scale)}px`,
                    height: `${Math.round(bin.h * h.scale)}px`,
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none",
                    backgroundImage: `url(${bin.src})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "contain",
                    imageRendering: "pixelated",
                  }}
                />
              ))}

              {activePile ? (
                <div
                  className="absolute"
                  style={{
                    left: `${Math.round(activePile.x * h.scale)}px`,
                    top: `${Math.round(activePile.y * h.scale)}px`,
                    width: `${Math.round(activePile.w * h.scale)}px`,
                    height: `${Math.round(activePile.h * h.scale)}px`,
                    transform: "translate(-50%, -50%)",
                    backgroundImage: `url(${activePile.src})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "contain",
                    imageRendering: "pixelated",
                    // Keep spawned trash piles visibly highlighted by team color.
                    filter: `drop-shadow(0 0 1px ${h.outline}) drop-shadow(0 0 6px ${h.outline})`,
                    pointerEvents: "none",
                  }}
                />
              ) : null}
            </>
          </div>

          {h.isPlayerTeam && activePile ? (
            <div
              className="trash-alert-bob absolute"
              aria-hidden
              style={{
                left: `${Math.round(512 * h.scale * 0.28)}px`,
                top: `${Math.round(512 * h.scale * 0.08)}px`,
                width: `${Math.max(28, Math.round(72 * h.scale))}px`,
                height: `${Math.max(28, Math.round(72 * h.scale))}px`,
                transform: "translate(-50%, -50%)",
                backgroundImage: "url('/Icons/exclamationicon.png')",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "contain",
                imageRendering: "pixelated",
                pointerEvents: "none",
              }}
            />
          ) : null}
        </div>
          );
        })()
      ))}

      {hoveredActivePile ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: `${Math.round(mousePos.x)}px`,
            top: `${Math.round(mousePos.y)}px`,
            width: "100px",
            height: "100px",
            transform: "translate(-6px, -24px)",
            backgroundImage: `url('${broomCursor}')`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "contain",
            imageRendering: "pixelated",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        />
      ) : null}
    </div>
  );
}

type TrashSprite = { src: string; x: number; y: number; w: number; h: number };

const LIGHT_BINS = ["/bins/lightbin1.png", "/bins/lightbin2.png", "/bins/lightbin3.png"] as const;
const MEDIUM_BINS = ["/bins/mediumbin1.png", "/bins/mediumbin2.png", "/bins/mediumbin3.png"] as const;
const LARGE_BINS = [
  "/bins/largebin1.png",
  "/bins/largebin2.png",
  "/bins/largebin3.png",
  "/bins/largebin4.png",
  "/bins/largebin5.png",
  "/bins/largebin6.png",
] as const;
const EXTRA_LARGE_BINS = [
  "/bins/extralargebin1.png",
  "/bins/extralargebin2.png",
  "/bins/extralargebin3.png",
  "/bins/extralargebin4.png",
  "/bins/extralargebin5.png",
  "/bins/extralargebin6.png",
] as const;
const TRASH_PILES = ["/bins/trashpile1.png"] as const;

const TRASH_ANCHOR: Record<PlacedHouse["kind"], { x: number; y: number }> = {
  // local offsets in a 512x512 house sprite box
  base: { x: 200, y: 397 },
  mid: { x: 190, y: 380 },
  full: { x: 195, y: 380 },
};

function houseBinsFor(h: PlacedHouse): TrashSprite[] {
  const family = familyForHouse(h.boardId, h.padIndex);
  const trashLbs = Math.max(1, Math.min(30, family.dailyAvgTrash));
  const anchor = TRASH_ANCHOR[h.kind];
  const rng = makeRng(`${h.id}:bin`);
  if (trashLbs <= 7) {
    const src = LIGHT_BINS[Math.floor(rng() * LIGHT_BINS.length)]!;
    return [{ src, x: anchor.x - 10, y: anchor.y - 6, w: 72, h: 62 }];
  }
  if (trashLbs <= 14) {
    const src = MEDIUM_BINS[Math.floor(rng() * MEDIUM_BINS.length)]!;
    return [{ src, x: anchor.x - 8, y: anchor.y - 4, w: 84, h: 70 }];
  }
  if (trashLbs <= 22) {
    const src = LARGE_BINS[Math.floor(rng() * LARGE_BINS.length)]!;
    return [{ src, x: anchor.x, y: anchor.y, w: 106, h: 86 }];
  }

  const src = EXTRA_LARGE_BINS[Math.floor(rng() * EXTRA_LARGE_BINS.length)]!;
  return [{ src, x: anchor.x + 6, y: anchor.y + 4, w: 118, h: 94 }];
}

function houseTrashPileFor(h: PlacedHouse, cleared: boolean): TrashSprite | null {
  if (cleared) return null;
  const family = familyForHouse(h.boardId, h.padIndex);
  const anchor = TRASH_ANCHOR[h.kind];
  const rng = makeRng(`${h.id}:pile`);
  const happiness = tempHappinessScore(family.dailyAvgTrash, family.complaintsPerWeek);
  const pileChance = Math.max(0, 0.34 - happiness * 0.0034); // higher happiness => lower pile chance
  if (rng() > pileChance) return null;

  const src = TRASH_PILES[Math.floor(rng() * TRASH_PILES.length)]!;
  return { src, x: anchor.x + -100, y: anchor.y + -90, w: 95, h: 80 };
}

function tempHappinessScore(avgTrashLbs: number, complaintsPerWeek: number): number {
  // temporary stand-in until backend provides explicit happiness
  const score = 100 - avgTrashLbs * 2.1 - complaintsPerWeek * 12;
  return Math.max(0, Math.min(100, score));
}

function trashPileClicksRequired(houseId: string): number {
  return 3 + (hash(`${houseId}:cleanup`) % 3); // 3..5
}

function brightenHex(hex: string, amount: number): string {
  // amount: 0..1, where 1 = white
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "rgba(255,255,255,0.95)";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const rr = Math.round(r + (255 - r) * amount);
  const gg = Math.round(g + (255 - g) * amount);
  const bb = Math.round(b + (255 - b) * amount);
  return `rgba(${rr},${gg},${bb},0.98)`;
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
  const dailyAvgTrash = 1 + (seed % 30); // 1..30 lbs
  const complaintsPerWeek = seed % 6; // 0..5
  const notes =
    complaintsPerWeek >= 4
      ? "Repeated violations: trash bins visible from street. Neighbor reports loud leaf blower usage."
      : dailyAvgTrash > 18
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

function makeRng(seed: string) {
  // Deterministic PRNG in [0,1)
  let x = hash(seed) >>> 0;
  return () => {
    // xorshift32
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    // convert to [0,1)
    return (x >>> 0) / 4294967296;
  };
}

function weightedPick<T extends { w: number }>(items: readonly T[], rng: () => number): T {
  const total = items.reduce((s, it) => s + it.w, 0);
  let r = rng() * total;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it;
  }
  return items[items.length - 1]!;
}

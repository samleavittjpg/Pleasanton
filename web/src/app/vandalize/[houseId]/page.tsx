"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

type HouseKind = "base" | "mid" | "full";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function colorDist(a: [number, number, number], b: [number, number, number]) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function kindLabel(kind: HouseKind) {
  if (kind === "mid") return "Mid";
  if (kind === "full") return "Full";
  return "Base";
}

function splashPath(kind: HouseKind, variant: string) {
  const k = kindLabel(kind);
  const v = variant.slice(0, 1).toUpperCase() + variant.slice(1);
  return `/house_splashes/${k}_House_Splash_${v}.png`;
}

type PixelMask = {
  width: number;
  height: number;
  allow: Uint8Array;
};

const DRAW_BG_DIST_THRESHOLD = 35;
const DRAW_GRASS_DIST_THRESHOLD = 55;
const OUTLINE_DARK_SUM_THRESHOLD = 75;
// Only treat the bottom strip as "grass"; prevents green siding being excluded.
const GRASS_Y_START_FRAC = 0.78;
const DOMINANT_COLOR_ALLOW_DIST = 40;
const DOMINANT_COLOR_MIN_SHARE = 0.06; // if dominant color is too rare, fall back

function isGrassLike(r: number, g: number, b: number, y: number, h: number, grassRef?: [number, number, number]) {
  // Only treat as grass if it matches the sampled lawn color.
  // This avoids excluding green-painted houses (e.g. Base_House_Splash_Green).
  if (!grassRef) return false;
  if (y < h * GRASS_Y_START_FRAC) return false;
  // Require a fairly bright "neon lawn" green.
  const greenish = g > 150 && g > r + 50 && g > b + 50;
  if (!greenish) return false;
  return colorDist([r, g, b], grassRef) < DRAW_GRASS_DIST_THRESHOLD;
}

function quantize5(v: number) {
  return (v >> 3) & 31; // 0..31
}

function dequantize5(q: number) {
  return (q << 3) | 4; // center of the bucket
}

function buildDominantColorAllowMask(imgData: ImageData): Uint8Array | null {
  const { width: w, height: h, data } = imgData;

  const bg: [number, number, number] = [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0];
  const grassSampleIdx = ((h - 2) * w + 2) * 4;
  const grassRef: [number, number, number] = [
    data[grassSampleIdx] ?? 0,
    data[grassSampleIdx + 1] ?? 0,
    data[grassSampleIdx + 2] ?? 0,
  ];

  // 5-bit quantization per channel → 15-bit key.
  const hist = new Map<number, number>();
  let considered = 0;

  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    const r = data[idx] ?? 0;
    const g = data[idx + 1] ?? 0;
    const b = data[idx + 2] ?? 0;
    const a = data[idx + 3] ?? 0;
    if (a < 5) continue;
    const y = Math.floor(i / w);

    // Exclude obvious non-house pixels.
    if (r + g + b <= OUTLINE_DARK_SUM_THRESHOLD) continue;
    if (colorDist([r, g, b], bg) < DRAW_BG_DIST_THRESHOLD) continue;
    if (isGrassLike(r, g, b, y, h, grassRef)) continue;

    const key = (quantize5(r) << 10) | (quantize5(g) << 5) | quantize5(b);
    hist.set(key, (hist.get(key) ?? 0) + 1);
    considered++;
  }

  if (considered < 5000 || hist.size < 10) return null;

  let bestKey = -1;
  let bestCount = 0;
  for (const [k, c] of hist.entries()) {
    if (c > bestCount) {
      bestCount = c;
      bestKey = k;
    }
  }

  if (bestKey < 0) return null;
  if (bestCount / considered < DOMINANT_COLOR_MIN_SHARE) return null;

  const qr = (bestKey >> 10) & 31;
  const qg = (bestKey >> 5) & 31;
  const qb = bestKey & 31;
  const dominant: [number, number, number] = [dequantize5(qr), dequantize5(qg), dequantize5(qb)];

  const allow = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    const r = data[idx] ?? 0;
    const g = data[idx + 1] ?? 0;
    const b = data[idx + 2] ?? 0;
    const a = data[idx + 3] ?? 0;
    if (a < 5) continue;
    const y = Math.floor(i / w);
    if (isGrassLike(r, g, b, y, h, grassRef)) continue;
    // Only draw on pixels near the dominant color.
    if (colorDist([r, g, b], dominant) <= DOMINANT_COLOR_ALLOW_DIST) allow[i] = 1;
  }

  return allow;
}

function buildHouseAllowMask(imgData: ImageData): Uint8Array {
  const dominant = buildDominantColorAllowMask(imgData);
  if (dominant) return dominant;

  const { width: w, height: h, data } = imgData;
  const allow = new Uint8Array(w * h);

  const bg: [number, number, number] = [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0];
  // sample grass near bottom-left; if it's not actually grass, the heuristics still catch "greenish"
  const grassSampleIdx = ((h - 2) * w + 2) * 4;
  const grassRef: [number, number, number] = [
    data[grassSampleIdx] ?? 0,
    data[grassSampleIdx + 1] ?? 0,
    data[grassSampleIdx + 2] ?? 0,
  ];

  const boundary = new Uint8Array(w * h);
  const fillable = new Uint8Array(w * h);

  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    const r = data[idx] ?? 0;
    const g = data[idx + 1] ?? 0;
    const b = data[idx + 2] ?? 0;
    const a = data[idx + 3] ?? 0;
    if (a < 5) continue;
    const y = Math.floor(i / w);

    const sum = r + g + b;
    if (sum <= OUTLINE_DARK_SUM_THRESHOLD) {
      boundary[i] = 1;
      continue;
    }

    if (colorDist([r, g, b], bg) < DRAW_BG_DIST_THRESHOLD) continue;
    if (isGrassLike(r, g, b, y, h, grassRef)) continue;
    fillable[i] = 1;
  }

  // Connected components: choose the largest "house-like" region.
  // This avoids accidentally selecting only a window/trim strip.
  const visited = new Uint8Array(w * h);

  const q: number[] = [];
  let bestStart = -1;
  let bestCount = 0;
  let bestAvgY = 0;

  const startsToConsider = (idx: number) => {
    const y = Math.floor(idx / w);
    // Ignore the bottom where curb/grass lives.
    return y < h * 0.75;
  };

  for (let i = 0; i < w * h; i++) {
    if (visited[i]) continue;
    if (!fillable[i]) continue;
    if (!startsToConsider(i)) {
      visited[i] = 1;
      continue;
    }

    // BFS this component.
    visited[i] = 1;
    q.length = 0;
    q.push(i);

    let count = 0;
    let sumY = 0;

    while (q.length) {
      const cur = q.pop()!;
      if (!fillable[cur]) continue;
      count++;
      sumY += Math.floor(cur / w);

      const x = cur % w;
      const y = Math.floor(cur / w);
      const n = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ] as const;
      for (const [nx, ny] of n) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (visited[ni]) continue;
        if (boundary[ni]) {
          visited[ni] = 1;
          continue;
        }
        visited[ni] = 1;
        if (fillable[ni]) q.push(ni);
      }
    }

    const avgY = count ? sumY / count : h;
    // Prefer bigger regions that aren't concentrated at the bottom.
    const score = avgY > h * 0.68 ? 0 : count;
    if (score > bestCount) {
      bestCount = score;
      bestStart = i;
      bestAvgY = avgY;
    }
  }

  if (bestStart < 0 || bestCount < 1500) {
    // Fallback: allow any non-background, non-grass pixel.
    return fillable;
  }

  // Re-run BFS for best component and mark allow.
  const visited2 = new Uint8Array(w * h);
  q.length = 0;
  q.push(bestStart);
  visited2[bestStart] = 1;

  while (q.length) {
    const cur = q.pop()!;
    if (!fillable[cur]) continue;
    allow[cur] = 1;

    const x = cur % w;
    const y = Math.floor(cur / w);
    const n = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as const;
    for (const [nx, ny] of n) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (visited2[ni]) continue;
      if (boundary[ni]) {
        visited2[ni] = 1;
        continue;
      }
      visited2[ni] = 1;
      if (fillable[ni]) q.push(ni);
    }
  }

  // If the best component still looks like it's too low, just fall back.
  if (bestAvgY > h * 0.68) return fillable;
  return allow;
}

export default function VandalizeHousePage() {
  const router = useRouter();
  const params = useParams<{ houseId: string }>();
  const search = useSearchParams();
  const houseId = params.houseId;
  const kind = (search.get("kind") ?? "base") as HouseKind;
  const variant = (search.get("variant") ?? "").trim();

  const bgSrc = useMemo(() => {
    if (!variant) return "";
    return splashPath(kind, variant);
  }, [kind, variant]);

  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const bgMaskRef = useRef<PixelMask | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#ff3bd5");
  const [brushSize, setBrushSize] = useState(7);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  const drawDot = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    const c = overlayRef.current;
    const img = bgImgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const rect = c.getBoundingClientRect();

    const x = clamp(Math.floor(((evt.clientX - rect.left) / rect.width) * c.width), 0, c.width - 1);
    const y = clamp(Math.floor(((evt.clientY - rect.top) / rect.height) * c.height), 0, c.height - 1);

    const mask = bgMaskRef.current;
    if (mask && mask.width === c.width && mask.height === c.height) {
      const idx = y * mask.width + x;
      if (!mask.allow[idx]) return;
    }

    ctx.fillStyle = brushColor;
    ctx.fillRect(x - Math.floor(brushSize / 2), y - Math.floor(brushSize / 2), brushSize, brushSize);
  };

  async function loadExistingGraffiti() {
    setStatus("loading");
    try {
      const res = await fetch(`/api/graffiti/${encodeURIComponent(houseId)}`, { cache: "no-store" });
      if (!res.ok) {
        setStatus("idle");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const img = new window.Image();
      img.onload = () => {
        const c = overlayRef.current;
        if (!c) return;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        setStatus("idle");
      };
      img.src = url;
    } catch {
      setStatus("error");
    }
  }

  async function saveGraffiti() {
    const c = overlayRef.current;
    if (!c) return;
    setStatus("saving");
    try {
      const pngDataUrl = c.toDataURL("image/png");
      const res = await fetch(`/api/graffiti/${encodeURIComponent(houseId)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pngDataUrl }),
      });
      if (!res.ok) throw new Error("save failed");
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 900);
    } catch {
      setStatus("error");
    }
  }

  if (!variant) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-zinc-200">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
          Missing `variant` in URL. Open this page via the house popup vandalize button.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 text-zinc-100">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-400">Vandalize</div>
          <div className="text-lg font-semibold">
            House {houseId} • {kindLabel(kind)} • {variant}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-zinc-700 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/70"
            onClick={() => router.back()}
            title="Back (Esc)"
          >
            ← Back
          </button>
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            Color <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            Brush
            <input
              type="range"
              min={2}
              max={18}
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
            />
            <span className="tabular-nums text-zinc-400">{brushSize}px</span>
          </label>
          <button
            type="button"
            className="rounded-md border border-zinc-700 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-900/70"
            onClick={() => {
              const c = overlayRef.current;
              if (!c) return;
              const ctx = c.getContext("2d");
              if (!ctx) return;
              ctx.clearRect(0, 0, c.width, c.height);
            }}
          >
            Clear
          </button>
          <button
            type="button"
            className="rounded-md border border-fuchsia-400/40 bg-fuchsia-500/20 px-3 py-2 text-sm font-semibold text-fuchsia-100 hover:bg-fuchsia-500/30"
            onClick={() => void saveGraffiti()}
          >
            Save
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
        <div className="relative mx-auto w-full max-w-[980px]">
          {/* background */}
          <Image
            alt=""
            src={bgSrc}
            width={980}
            height={560}
            unoptimized
            priority
            className="h-auto w-full select-none [image-rendering:pixelated]"
            draggable={false}
            onLoad={() => {
              // Next Image wraps the <img>, so grab the actual underlying element.
              const root = document.querySelector<HTMLImageElement>(`img[src="${bgSrc}"]`) ?? document.querySelector<HTMLImageElement>("img[src*='House_Splash_']");
              if (!root) return;
              bgImgRef.current = root;
              const c = overlayRef.current;
              if (!c) return;
              c.width = root.naturalWidth || 980;
              c.height = root.naturalHeight || 560;
              // Build a pixel mask from the splash so the drawable area matches the outlined house.
              try {
                const off = document.createElement("canvas");
                off.width = c.width;
                off.height = c.height;
                const offCtx = off.getContext("2d", { willReadFrequently: true });
                if (offCtx) {
                  offCtx.imageSmoothingEnabled = false;
                  offCtx.drawImage(root, 0, 0, off.width, off.height);
                  const imgData = offCtx.getImageData(0, 0, off.width, off.height);
                  bgMaskRef.current = {
                    width: imgData.width,
                    height: imgData.height,
                    allow: buildHouseAllowMask(imgData),
                  };
                } else {
                  bgMaskRef.current = null;
                }
              } catch {
                bgMaskRef.current = null;
              }
              void loadExistingGraffiti();
            }}
          />

          {/* drawing overlay */}
          <canvas
            ref={overlayRef}
            className="absolute left-0 top-0 h-full w-full cursor-crosshair"
            style={{ imageRendering: "pixelated" }}
            onPointerDown={(e) => {
              setIsDrawing(true);
              (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
              drawDot(e);
            }}
            onPointerMove={(e) => {
              if (!isDrawing) return;
              drawDot(e);
            }}
            onPointerUp={() => setIsDrawing(false)}
            onPointerCancel={() => setIsDrawing(false)}
          />

        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
          <div>
            Draw only on the outlined house area. Saved graffiti is shared for anyone on this server opening this house.
          </div>
          <div className="tabular-nums">
            {status === "loading" ? "Loading…" : null}
            {status === "saving" ? "Saving…" : null}
            {status === "saved" ? "Saved" : null}
            {status === "error" ? "Error" : null}
            {status === "idle" ? " " : null}
          </div>
        </div>
      </div>
    </div>
  );
}


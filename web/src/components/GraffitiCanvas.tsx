"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function GraffitiCanvas(props: {
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#ff3bd5");
  const [size, setSize] = useState(6);

  const bg = useMemo(() => "#0b0b0f", []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);
  }, [bg]);

  const drawAt = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const rect = c.getBoundingClientRect();
    const x = clamp(Math.floor(((evt.clientX - rect.left) / rect.width) * c.width), 0, c.width - 1);
    const y = clamp(Math.floor(((evt.clientY - rect.top) / rect.height) * c.height), 0, c.height - 1);
    ctx.fillStyle = color;
    ctx.fillRect(x - Math.floor(size / 2), y - Math.floor(size / 2), size, size);
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-zinc-200">
          Color
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-200">
          Brush
          <input
            type="range"
            min={2}
            max={18}
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value, 10))}
          />
          <span className="tabular-nums text-zinc-400">{size}px</span>
        </label>
        <button
          className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold hover:bg-zinc-900"
          onClick={() => {
            const c = canvasRef.current;
            if (!c) return;
            const ctx = c.getContext("2d");
            if (!ctx) return;
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, c.width, c.height);
          }}
        >
          Clear
        </button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <canvas
          ref={canvasRef}
          width={320}
          height={220}
          className="h-[220px] w-full cursor-crosshair rounded-lg bg-black"
          onPointerDown={(e) => {
            setIsDrawing(true);
            (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
            drawAt(e);
          }}
          onPointerMove={(e) => {
            if (!isDrawing) return;
            drawAt(e);
          }}
          onPointerUp={() => setIsDrawing(false)}
          onPointerCancel={() => setIsDrawing(false)}
        />
      </div>

      <div className="flex justify-end gap-2">
        <button className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900" onClick={props.onCancel}>
          Cancel
        </button>
        <button
          className="rounded-lg bg-fuchsia-400/90 px-3 py-2 text-sm font-semibold text-fuchsia-950 hover:bg-fuchsia-300"
          onClick={() => {
            const c = canvasRef.current;
            if (!c) return;
            props.onDone(c.toDataURL("image/png"));
          }}
        >
          Save graffiti
        </button>
      </div>
    </div>
  );
}


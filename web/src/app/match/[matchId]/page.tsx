"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { HOA_WELCOME_SESSION_KEY } from "@/lib/hoa-welcome";
import { connectClient } from "../../../lib/ws";

const PLOT_LABELS = [
  "A1",
  "A2",
  "A3",
  "A4",
  "B1",
  "B2",
  "B3",
  "B4",
  "C1",
  "C2",
  "C3",
  "C4",
  "D1",
  "D2",
  "D3",
  "D4",
] as const;
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 1.9;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function MatchNeighborhoodPage() {
  const params = useParams();
  const matchId = String(params.matchId ?? "").toUpperCase();

  const client = useMemo(() => connectClient(), []);

  const [plots, setPlots] = useState<Record<string, string | null>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyPlot, setBusyPlot] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoaWelcomeOpen, setHoaWelcomeOpen] = useState(false);
  const [hoaWelcomeSlide, setHoaWelcomeSlide] = useState(0);
  const dragPointerId = useRef<number | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  const [playerName] = useState(() => {
    if (typeof window === "undefined") return "Anonymous";
    return localStorage.getItem("pleasantonPlayerName")?.trim() || "Anonymous";
  });

  const refresh = useCallback(async () => {
    if (!matchId) return;
    setLoadError(null);
    try {
      const data = await client.getMatch(matchId);
      if (!data.exists) {
        setLoadError("This match code does not exist. Ask the host for the code or create a new match.");
        return;
      }
      setPlots(data.plots ?? {});
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load match");
    }
  }, [client, matchId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = sessionStorage.getItem(HOA_WELCOME_SESSION_KEY);
    if (v === "1") {
      sessionStorage.setItem(HOA_WELCOME_SESSION_KEY, "shown");
      setHoaWelcomeOpen(true);
    } else if (v === "shown") {
      setHoaWelcomeOpen(true);
    }
  }, []);

  const dismissHoaWelcome = () => {
    sessionStorage.removeItem(HOA_WELCOME_SESSION_KEY);
    setHoaWelcomeOpen(false);
    setHoaWelcomeSlide(0);
  };

  const claimPlot = async (plotIndex: string) => {
    setBusyPlot(plotIndex);
    try {
      const { plots: next } = await client.pickPlot(matchId, plotIndex, playerName);
      setPlots(next);
    } catch {
      // Keep the scene immersive: failed actions don't render text overlays.
    } finally {
      setBusyPlot(null);
    }
  };

  const getPlotPosition = (index: number) => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    return {
      left: `${8 + col * 23}%`,
      top: `${10 + row * 21}%`,
    };
  };

  const adjustZoom = useCallback((delta: number) => {
    setZoom((current) => clamp(current + delta, MIN_ZOOM, MAX_ZOOM));
  }, []);

  const handleWheelZoom = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    adjustZoom(event.deltaY > 0 ? -0.06 : 0.06);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button")) return;
    dragPointerId.current = event.pointerId;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    panStartRef.current = { ...pan };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || dragPointerId.current !== event.pointerId) return;
    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;
    setPan({
      x: clamp(panStartRef.current.x + deltaX, -320, 320),
      y: clamp(panStartRef.current.y + deltaY, -240, 240),
    });
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerId.current !== event.pointerId) return;
    dragPointerId.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (!matchId) return <div className="h-screen w-screen bg-zinc-950" />;

  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-400 text-zinc-100">
      {hoaWelcomeOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hoa-welcome-title"
        >
          <div
            className="hoa-welcome-panel max-h-[min(90vh,520px)] w-full max-w-lg overflow-y-auto border-4 border-black bg-[#f5d547] p-5 shadow-[6px_6px_0_#000] sm:p-7"
            style={{ imageRendering: "pixelated" }}
          >
            {hoaWelcomeSlide === 0 ? (
              <>
                <h2 id="hoa-welcome-title" className="text-center text-[0.65rem] leading-relaxed text-black sm:text-xs">
                  Welcome to your neighborhood! As the HOA Manager, you will complete your duties and manage residents
                  ensuring their happiness.
                </h2>
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    className="hoa-welcome-btn"
                    onClick={() => setHoaWelcomeSlide(1)}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-center text-[0.65rem] leading-relaxed text-black sm:text-xs">
                  Complete tasks, Screen residents, and keep the neighborhood nice and pleasant. Good Luck!
                </p>
                <div className="mt-6 flex justify-center">
                  <button type="button" className="hoa-welcome-btn" onClick={dismissHoaWelcome}>
                    Start
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
      <div className="relative h-full w-full bg-gradient-to-b from-zinc-300 via-zinc-400 to-zinc-500 p-4 sm:p-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[8%] top-[8%] h-10 w-24 border-2 border-zinc-100/70 bg-zinc-100/80 shadow-[6px_6px_0_rgba(161,161,170,0.45)]" />
          <div className="absolute left-[13%] top-[6%] h-8 w-10 border-2 border-zinc-100/70 bg-zinc-100/80" />
          <div className="absolute left-[24%] top-[9%] h-8 w-9 border-2 border-zinc-100/70 bg-zinc-100/80" />

          <div className="absolute right-[12%] top-[12%] h-10 w-28 border-2 border-zinc-100/70 bg-zinc-100/80 shadow-[6px_6px_0_rgba(161,161,170,0.45)]" />
          <div className="absolute right-[22%] top-[9%] h-8 w-10 border-2 border-zinc-100/70 bg-zinc-100/80" />
          <div className="absolute right-[7%] top-[14%] h-8 w-11 border-2 border-zinc-100/70 bg-zinc-100/80" />
        </div>
        <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => adjustZoom(0.1)}
            className="h-9 w-9 border-2 border-zinc-100 bg-zinc-700/85 text-lg leading-none text-white shadow-[3px_3px_0_rgba(39,39,42,0.7)]"
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => adjustZoom(-0.1)}
            className="h-9 w-9 border-2 border-zinc-100 bg-zinc-700/85 text-lg leading-none text-white shadow-[3px_3px_0_rgba(39,39,42,0.7)]"
          >
            -
          </button>
        </div>
        <div
          className={`mx-auto h-full w-full max-w-[1500px] touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          style={{ perspective: "1300px" }}
          onWheel={handleWheelZoom}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        >
          <div
            className="h-full w-full transition-transform duration-100 ease-out"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "50% 50%" }}
          >
            <div
              className={`relative h-full w-full rounded-none border border-zinc-700/60 bg-zinc-500/35 shadow-[0_30px_90px_rgba(24,24,27,0.55)] ${
                loadError ? "opacity-50 grayscale" : ""
              }`}
              style={{ transform: "rotateX(56deg) rotateZ(-45deg) scaleY(-1)", transformStyle: "preserve-3d" }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(244,244,245,0.22),_rgba(161,161,170,0.24)_52%,_rgba(63,63,70,0.76))]" />

              {[22, 45, 68].map((x) => (
                <div
                  key={`v-road-${x}`}
                className="absolute h-full w-[8.5%] border-x border-zinc-400/70 bg-zinc-600"
                  style={{ left: `${x}%` }}
                />
              ))}
              {[26, 49, 72].map((x) => (
                <div
                  key={`v-mark-${x}`}
                  className="pointer-events-none absolute h-full w-[0.8%] bg-[repeating-linear-gradient(to_bottom,_rgba(253,224,71,0.95)_0_14px,_transparent_14px_28px)]"
                  style={{ left: `${x}%` }}
                />
              ))}
              {[24, 47, 70].map((y) => (
                <div
                  key={`h-road-${y}`}
                className="absolute w-full border-y border-zinc-400/70 bg-zinc-600"
                  style={{ top: `${y}%`, height: "9%" }}
                />
              ))}
              {[28, 51, 74].map((y) => (
                <div
                  key={`h-mark-${y}`}
                  className="pointer-events-none absolute h-[0.8%] w-full bg-[repeating-linear-gradient(to_right,_rgba(253,224,71,0.95)_0_14px,_transparent_14px_28px)]"
                  style={{ top: `${y}%` }}
                />
              ))}

              {PLOT_LABELS.map((label, index) => {
                const key = String(index);
                const owner = plots[key];
                const taken = owner != null;
                const isBusy = busyPlot === key;
                const isYours = owner === playerName;
                const position = getPlotPosition(index);

                return (
                  <button
                    key={label}
                    type="button"
                    disabled={taken || isBusy || !!loadError}
                    onClick={() => void claimPlot(key)}
                    aria-label={`Plot ${label}`}
                    className={`absolute h-[18%] w-[18%] border transition ${
                      taken
                        ? "cursor-not-allowed border-zinc-700 bg-zinc-500"
                        : "border-zinc-200 bg-zinc-300 hover:-translate-y-1 hover:bg-zinc-200"
                    } ${isBusy ? "opacity-70" : ""}`}
                    style={{
                      left: position.left,
                      top: position.top,
                      transform: "translateZ(20px)",
                      boxShadow: taken ? "0 10px 0 rgba(39, 39, 42, 0.55)" : "0 12px 0 rgba(63, 63, 70, 0.7)",
                    }}
                  >
                    {taken ? (
                      <span
                        className={`absolute left-[34%] top-[30%] block h-[40%] w-[32%] border ${
                          isYours ? "border-cyan-200 bg-cyan-300/70" : "border-zinc-300 bg-zinc-400/75"
                        }`}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

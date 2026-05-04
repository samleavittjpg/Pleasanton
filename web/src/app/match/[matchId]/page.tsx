"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

export default function MatchNeighborhoodPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = String(params.matchId ?? "").toUpperCase();

  const client = useMemo(() => connectClient(), []);

  const [lengthMinutes, setLengthMinutes] = useState(10);
  const [plots, setPlots] = useState<Record<string, string | null>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyPlot, setBusyPlot] = useState<string | null>(null);

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
      setLengthMinutes(data.lengthMinutes ?? 10);
      setPlots(data.plots ?? {});
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load match");
    }
  }, [client, matchId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const claimPlot = async (plotIndex: string) => {
    setActionError(null);
    setBusyPlot(plotIndex);
    try {
      const { plots: next } = await client.pickPlot(matchId, plotIndex, playerName);
      setPlots(next);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not claim plot");
    } finally {
      setBusyPlot(null);
    }
  };

  if (!matchId) {
    return (
      <div className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
        <p className="text-sm">Invalid match URL.</p>
        <Link href="/create-match" className="mt-4 inline-block text-emerald-400 underline">
          Back to lobby
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg uppercase tracking-wide text-zinc-100">Neighborhood</h1>
            <p className="mt-2 text-xs text-zinc-400">Pick a lot for your house. Share the match code so friends can join the same server session.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-[10px] uppercase hover:bg-zinc-800"
              onClick={() => void refresh()}
            >
              Refresh
            </button>
            <button
              type="button"
              className="rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-[10px] uppercase hover:bg-zinc-800"
              onClick={() => router.push("/create-match")}
            >
              Lobby
            </button>
          </div>
        </div>

        <section className="mt-8 rounded-none border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="text-[10px] uppercase text-zinc-400">Match code (share this)</div>
          <div className="mt-2 font-mono text-3xl tracking-[0.35em] text-emerald-300">{matchId}</div>
          <div className="mt-3 text-xs text-zinc-400">
            Session length: <span className="text-zinc-200">{lengthMinutes} min</span> · Playing as{" "}
            <span className="text-zinc-200">{playerName}</span>
          </div>
        </section>

        {loadError ? (
          <div className="mt-6 rounded-none border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">{loadError}</div>
        ) : null}

        {actionError ? (
          <div className="mt-4 rounded-none border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-xs text-amber-100">{actionError}</div>
        ) : null}

        {!loadError ? (
          <section className="mt-8">
            <h2 className="text-xs uppercase text-zinc-300">Lots — tap an empty lot to move in</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PLOT_LABELS.map((label, index) => {
                const key = String(index);
                const owner = plots[key];
                const taken = owner != null;
                const isBusy = busyPlot === key;

                return (
                  <button
                    key={label}
                    type="button"
                    disabled={taken || isBusy}
                    onClick={() => void claimPlot(key)}
                    className={`flex min-h-[88px] flex-col items-start justify-between rounded-none border p-3 text-left text-[10px] uppercase transition ${
                      taken
                        ? "cursor-not-allowed border-zinc-700 bg-zinc-950 text-zinc-500"
                        : "border-zinc-600 bg-zinc-900 text-zinc-100 hover:border-emerald-400 hover:bg-zinc-800"
                    } ${isBusy ? "opacity-70" : ""}`}
                  >
                    <span className="text-zinc-400">Lot {label}</span>
                    <span className="mt-2 text-[9px] normal-case text-zinc-300">
                      {taken ? (
                        <>
                          <span className="block text-zinc-500">Occupied</span>
                          <span className="block truncate text-zinc-200">{owner}</span>
                        </>
                      ) : (
                        <span className="text-emerald-300/90">Available — select</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Modal } from "../../../components/Modal";
import { GraffitiCanvas } from "../../../components/GraffitiCanvas";
import { TileMap } from "../../../components/TileMap";
import { connectClient, newActionId } from "../../../lib/ws";

type MatchView = any;

export default function MatchPage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const matchId = params.matchId;

  const client = useMemo(() => connectClient(), []);
  const [view, setView] = useState<MatchView | null>(null);
  const [error, setError] = useState<string>("");
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [showGraffitiModal, setShowGraffitiModal] = useState(false);
  const [graffitiTarget, setGraffitiTarget] = useState<{ targetPlayerId: string; houseIndex: number } | null>(null);

  useEffect(() => {
    return client.onMessage((msg) => {
      if (msg.type === "server/error") setError(msg.message);
      if (msg.type === "server/matchSnapshot" && msg.matchId === matchId) setView(msg.state);
      if (msg.type === "server/matchDelta" && msg.matchId === matchId) setView(msg.delta);
      if (msg.type === "server/matchFinished" && msg.matchId === matchId) {
        setError(`Match finished. Winner: ${msg.winnerPlayerId}`);
      }
    });
  }, [client, matchId]);

  useEffect(() => {
    // If user navigates here directly, attempt to join.
    client.joinMatch(matchId);
  }, [client, matchId]);

  const you = view?.you?.neighborhood;
  const rivals = view?.rivals ?? [];

  if (!view) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <main className="mx-auto max-w-4xl px-6 py-10">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Match</div>
            <button className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900" onClick={() => router.push("/")}>
              Back
            </button>
          </div>
          <div className="mt-6 text-sm text-zinc-400">Waiting for server state…</div>
          <div className="mt-2 text-xs text-zinc-600">If you joined via URL, use the lobby to send your name first.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <div className="text-lg font-semibold tracking-tight">Match {matchId}</div>
            <div className="text-xs text-zinc-500">
              Status: <span className="text-zinc-300">{view.status}</span> · Tick{" "}
              <span className="text-zinc-300 tabular-nums">{view.tick}</span>
            </div>
          </div>
          <button className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900" onClick={() => router.push("/")}>
            Exit
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <div className="grid gap-1">
                <div className="text-xs text-zinc-500">Budget</div>
                <div className="text-lg font-semibold tabular-nums">{you.budget.toFixed(1)}</div>
              </div>
              <div className="grid gap-1">
                <div className="text-xs text-zinc-500">Heat</div>
                <div className="text-lg font-semibold tabular-nums">{you.heat.toFixed(0)}</div>
              </div>
              <div className="grid gap-1">
                <div className="text-xs text-zinc-500">Avg happiness</div>
                <div className="text-lg font-semibold tabular-nums">{you.avgHappiness.toFixed(2)}</div>
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  className="rounded-lg bg-emerald-500/90 px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
                  onClick={() =>
                    client.send({
                      type: "client/action",
                      matchId,
                      actionId: newActionId(),
                      action: { kind: "maintenance/cleanStreet" },
                    })
                  }
                >
                  Clean streets ($4)
                </button>
                <button
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold hover:bg-zinc-900"
                  onClick={() => {
                    if (selectedHouse == null) return;
                    client.send({
                      type: "client/action",
                      matchId,
                      actionId: newActionId(),
                      action: { kind: "maintenance/pickupTrash", houseIndex: selectedHouse },
                    });
                  }}
                >
                  Pickup trash ($2)
                </button>
                <button
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold hover:bg-zinc-900"
                  onClick={() => {
                    if (selectedHouse == null) return;
                    client.send({
                      type: "client/action",
                      matchId,
                      actionId: newActionId(),
                      action: { kind: "maintenance/removeGraffiti", houseIndex: selectedHouse },
                    });
                  }}
                >
                  Remove graffiti ($3)
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-zinc-200">Your neighborhood (10 houses)</div>
                <div className="text-xs text-zinc-500">Click a house for details / selection</div>
              </div>
              <TileMap
                houses={you.houses}
                selectedHouseIndex={selectedHouse ?? undefined}
                onHouseClick={(i) => {
                  setSelectedHouse(i);
                  setShowHouseModal(true);
                }}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <div className="text-sm font-semibold text-zinc-200">Services funding</div>
              <div className="mt-3 grid gap-3">
                {(["school", "sanitation", "parks", "policing"] as const).map((k) => (
                  <label key={k} className="grid gap-1">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span className="capitalize">{k}</span>
                      <span className="tabular-nums">{Math.round(you.services[k] * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(you.services[k] * 100)}
                      onChange={(e) => {
                        const next = { ...you.services, [k]: parseInt(e.target.value, 10) / 100 };
                        client.send({
                          type: "client/action",
                          matchId,
                          actionId: newActionId(),
                          action: { kind: "funding/set", ...next },
                        });
                      }}
                    />
                  </label>
                ))}
              </div>
              <div className="mt-3 text-xs text-zinc-500">Funding costs budget over time but boosts happiness.</div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-zinc-200">Rivals (redacted view)</div>
                <div className="text-xs text-zinc-500">{rivals.length} opponent(s)</div>
              </div>
              <div className="mt-3 grid gap-2">
                {rivals.map((r: any) => (
                  <div key={r.ownerPlayerId} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-zinc-400">Player</div>
                      <div className="text-xs font-semibold text-zinc-200">{r.ownerPlayerId.slice(0, 8)}</div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                      <div>
                        Happiness: <span className="text-zinc-200 tabular-nums">{r.avgHappiness.toFixed(2)}</span>
                      </div>
                      <div>
                        Heat: <span className="text-zinc-200">{r.heatLevel}</span>
                      </div>
                      <div>
                        Clean: <span className="text-zinc-200 tabular-nums">{Math.round(r.cleanliness01 * 100)}%</span>
                      </div>
                      <div>
                        Graffiti-free:{" "}
                        <span className="text-zinc-200 tabular-nums">{Math.round(r.graffitiFree01 * 100)}%</span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-lg bg-amber-300/90 px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-200"
                        onClick={() =>
                          client.send({
                            type: "client/action",
                            matchId,
                            actionId: newActionId(),
                            action: { kind: "sabotage/dumpTrash", targetPlayerId: r.ownerPlayerId },
                          })
                        }
                      >
                        Dump trash ($6)
                      </button>
                      <button
                        className="rounded-lg bg-fuchsia-400/90 px-3 py-2 text-xs font-semibold text-fuchsia-950 hover:bg-fuchsia-300"
                        onClick={() => {
                          setGraffitiTarget({ targetPlayerId: r.ownerPlayerId, houseIndex: 0 });
                          setShowGraffitiModal(true);
                        }}
                      >
                        Graffiti house… ($7)
                      </button>
                    </div>
                  </div>
                ))}

                {rivals.length === 0 ? <div className="text-sm text-zinc-500">Waiting for others to join.</div> : null}
              </div>
            </div>
          </div>
        </div>

        {showHouseModal && selectedHouse != null ? (
          <Modal
            title={`House ${selectedHouse + 1}`}
            onClose={() => {
              setShowHouseModal(false);
            }}
          >
            {(() => {
              const h = you.houses[selectedHouse];
              return (
                <div className="grid gap-3 text-sm text-zinc-200">
                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                    <div>
                      Trash: <span className="text-zinc-200 tabular-nums">{Math.round(h.trashed01 * 100)}%</span>
                    </div>
                    <div>
                      Graffiti: <span className="text-zinc-200 tabular-nums">{Math.round(h.graffiti01 * 100)}%</span>
                    </div>
                    <div>
                      Foreclosed: <span className="text-zinc-200">{h.foreclosed ? "yes" : "no"}</span>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    This is the MVP “house close-up”. Later we can swap this for a real pixel-art illustration.
                  </div>
                </div>
              );
            })()}
          </Modal>
        ) : null}

        {showGraffitiModal && graffitiTarget ? (
          <Modal
            title="Graffiti operation"
            onClose={() => {
              setShowGraffitiModal(false);
              setGraffitiTarget(null);
            }}
          >
            <div className="grid gap-3">
              <div className="grid gap-2">
                <div className="text-xs text-zinc-400">Target house index (0–9)</div>
                <input
                  type="number"
                  min={0}
                  max={9}
                  value={graffitiTarget.houseIndex}
                  onChange={(e) =>
                    setGraffitiTarget({ ...graffitiTarget, houseIndex: Math.max(0, Math.min(9, parseInt(e.target.value || "0", 10))) })
                  }
                  className="w-32 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                />
              </div>
              <GraffitiCanvas
                onCancel={() => {
                  setShowGraffitiModal(false);
                  setGraffitiTarget(null);
                }}
                onDone={(dataUrl) => {
                  client.send({
                    type: "client/action",
                    matchId,
                    actionId: newActionId(),
                    action: {
                      kind: "sabotage/graffitiHouse",
                      targetPlayerId: graffitiTarget.targetPlayerId,
                      houseIndex: graffitiTarget.houseIndex,
                      graffitiDataUrl: dataUrl,
                    },
                  });
                  setShowGraffitiModal(false);
                  setGraffitiTarget(null);
                }}
              />
            </div>
          </Modal>
        ) : null}
      </main>
    </div>
  );
}


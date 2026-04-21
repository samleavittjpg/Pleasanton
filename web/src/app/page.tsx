"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { connectClient } from "../lib/ws";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("Anonymous");
  const [matchId, setMatchId] = useState("");
  const [lengthMinutes, setLengthMinutes] = useState<10 | 20 | 30>(10);
  const [status, setStatus] = useState<string>("");

  const client = useMemo(() => connectClient(), []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Pleasanton</h1>
          <div className="text-sm text-zinc-400">HOA PvP neighborhood-builder (MVP)</div>
        </div>

        <div className="mt-8 grid gap-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <label className="grid gap-2">
            <div className="text-sm font-medium text-zinc-200">Display name</div>
            <input
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="MayorTrashman"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-sm font-medium text-zinc-200">Create match length</div>
              <div className="flex gap-2">
                {[10, 20, 30].map((m) => (
                  <button
                    key={m}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      lengthMinutes === m ? "border-zinc-500 bg-zinc-800" : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900"
                    }`}
                    onClick={() => setLengthMinutes(m as 10 | 20 | 30)}
                  >
                    {m}m
                  </button>
                ))}
              </div>
              <button
                className="mt-2 rounded-lg bg-emerald-500/90 px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
                onClick={async () => {
                  setStatus("Creating match…");
                  client.send({ type: "client/hello", name });
                  const created = await client.createMatch(lengthMinutes);
                  setStatus("");
                  router.push(`/match/${created.matchId}`);
                }}
              >
                Create match
              </button>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium text-zinc-200">Join match</div>
              <input
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
                value={matchId}
                onChange={(e) => setMatchId(e.target.value)}
                placeholder="match id…"
              />
              <button
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-semibold hover:bg-zinc-900"
                onClick={async () => {
                  if (!matchId.trim()) return;
                  setStatus("Joining match…");
                  client.send({ type: "client/hello", name });
                  await client.joinMatch(matchId.trim());
                  setStatus("");
                  router.push(`/match/${matchId.trim()}`);
                }}
              >
                Join
              </button>
            </div>
          </div>

          {status ? <div className="text-sm text-zinc-400">{status}</div> : null}
        </div>

        <div className="mt-8 text-sm text-zinc-400">
          Server default: <span className="text-zinc-200">ws://localhost:8787</span>
        </div>
      </main>
    </div>
  );
}

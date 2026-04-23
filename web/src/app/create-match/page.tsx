"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { connectClient } from "../../lib/ws";

const SKIN_TONES = ["#f8d7b5", "#d9a97f", "#ad7f58", "#7f5a3f"] as const;
const SHIRT_COLORS = ["#8cc8ff", "#7fd38a", "#f5ae75", "#d39af5"] as const;
const HAIR_COLORS = ["#2f2523", "#5d3d2b", "#d8b26e", "#5a5a5a"] as const;

export default function CreateMatchPage() {
  const router = useRouter();
  const [name, setName] = useState("Anonymous");
  const [matchId, setMatchId] = useState("");
  const [lengthMinutes, setLengthMinutes] = useState<10 | 20 | 30>(10);
  const [status, setStatus] = useState<string>("");
  const [skinTone, setSkinTone] = useState<string>(SKIN_TONES[0]);
  const [shirtColor, setShirtColor] = useState<string>(SHIRT_COLORS[0]);
  const [hairColor, setHairColor] = useState<string>(HAIR_COLORS[0]);
  const [hat, setHat] = useState(false);

  const client = useMemo(() => connectClient(), []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl uppercase tracking-wide">Create Match</h1>
            <div className="mt-2 text-xs text-zinc-400">Prototype Lobby + Character Setup</div>
          </div>
          <button
            className="rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs uppercase hover:bg-zinc-800"
            onClick={() => router.push("/")}
          >
            Back
          </button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr,320px]">
          <section className="grid gap-6 rounded-none border border-zinc-800 bg-zinc-900/40 p-6">
            <label className="grid gap-2">
              <div className="text-xs uppercase text-zinc-200">Display Name</div>
              <input
                className="rounded-none border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-400"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="MayorTrashman"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-xs uppercase text-zinc-200">Create Match Length</div>
                <div className="flex gap-2">
                  {[10, 20, 30].map((m) => (
                    <button
                      key={m}
                      className={`rounded-none border px-3 py-2 text-xs ${
                        lengthMinutes === m ? "border-zinc-400 bg-zinc-800" : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900"
                      }`}
                      onClick={() => setLengthMinutes(m as 10 | 20 | 30)}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
                <button
                  className="mt-2 rounded-none border border-emerald-300 bg-emerald-500 px-3 py-2 text-xs text-emerald-950 hover:bg-emerald-400"
                  onClick={async () => {
                    setStatus("Creating match...");
                    client.send({ type: "client/hello", name });
                    const created = await client.createMatch(lengthMinutes);
                    setStatus("");
                    router.push(`/match/${created.matchId}`);
                  }}
                >
                  Create Match
                </button>
              </div>

              <div className="grid gap-2">
                <div className="text-xs uppercase text-zinc-200">Join Match</div>
                <input
                  className="rounded-none border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-400"
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value)}
                  placeholder="match id..."
                />
                <button
                  className="rounded-none border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs hover:bg-zinc-900"
                  onClick={async () => {
                    if (!matchId.trim()) return;
                    setStatus("Joining match...");
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

            {status ? <div className="text-xs text-zinc-400">{status}</div> : null}
          </section>

          <aside className="rounded-none border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="text-xs uppercase text-zinc-200">Character Prototype</h2>
            <div className="character-stage mt-4">
              <div className="character-shadow" />
              <div className={`character-hat ${hat ? "is-visible" : ""}`} />
              <div className="character-head" style={{ backgroundColor: skinTone }} />
              <div className="character-hair" style={{ backgroundColor: hairColor }} />
              <div className="character-body" style={{ backgroundColor: shirtColor }} />
              <div className="character-legs" />
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <div className="mb-2 text-[10px] uppercase text-zinc-400">Skin</div>
                <div className="flex gap-2">
                  {SKIN_TONES.map((color) => (
                    <button
                      key={color}
                      className="picker-dot"
                      style={{ backgroundColor: color }}
                      onClick={() => setSkinTone(color)}
                      aria-label={`Skin ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[10px] uppercase text-zinc-400">Hair</div>
                <div className="flex gap-2">
                  {HAIR_COLORS.map((color) => (
                    <button
                      key={color}
                      className="picker-dot"
                      style={{ backgroundColor: color }}
                      onClick={() => setHairColor(color)}
                      aria-label={`Hair ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[10px] uppercase text-zinc-400">Shirt</div>
                <div className="flex gap-2">
                  {SHIRT_COLORS.map((color) => (
                    <button
                      key={color}
                      className="picker-dot"
                      style={{ backgroundColor: color }}
                      onClick={() => setShirtColor(color)}
                      aria-label={`Shirt ${color}`}
                    />
                  ))}
                </div>
              </div>

              <label className="mt-1 flex items-center gap-2 text-[10px] uppercase text-zinc-300">
                <input type="checkbox" checked={hat} onChange={(e) => setHat(e.target.checked)} />
                Hat
              </label>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { connectClient } from "../../lib/ws";

const SKIN_TONES = ["#f8d7b5", "#d9a97f", "#ad7f58", "#7f5a3f"] as const;
const SHIRT_COLORS = ["#8cc8ff", "#7fd38a", "#f5ae75", "#d39af5"] as const;
const HAIR_COLORS = ["#2f2523", "#5d3d2b", "#d8b26e", "#5a5a5a"] as const;
const EYE_COLORS = ["#131313", "#3b82f6", "#22c55e", "#f97316", "#a855f7"] as const;
const HAIR_STYLES = ["short", "spiky", "bob", "buzz"] as const;
type HairStyle = (typeof HAIR_STYLES)[number];

export default function CreateMatchPage() {
  const router = useRouter();
  const [name, setName] = useState("Anonymous");
  const [matchId, setMatchId] = useState("");
  const [lengthMinutes, setLengthMinutes] = useState<10 | 20 | 30>(10);
  const [status, setStatus] = useState<string>("");
  const [skinTone, setSkinTone] = useState<string>(SKIN_TONES[0]);
  const [shirtColor, setShirtColor] = useState<string>(SHIRT_COLORS[0]);
  const [hairColor, setHairColor] = useState<string>(HAIR_COLORS[0]);
  const [eyeColor, setEyeColor] = useState<string>(EYE_COLORS[0]);
  const [hairStyle, setHairStyle] = useState<HairStyle>(HAIR_STYLES[0]);
  const [customizerStatus, setCustomizerStatus] = useState("");

  const client = useMemo(() => connectClient(), []);
  const randomFrom = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

  const randomizeCharacter = () => {
    setSkinTone(randomFrom(SKIN_TONES));
    setShirtColor(randomFrom(SHIRT_COLORS));
    setHairColor(randomFrom(HAIR_COLORS));
    setEyeColor(randomFrom(EYE_COLORS));
    setHairStyle(randomFrom(HAIR_STYLES));
    setCustomizerStatus("Randomized");
  };

  const saveCharacter = () => {
    const character = { skinTone, shirtColor, hairColor, eyeColor, hairStyle };
    localStorage.setItem("pleasantonCharacter", JSON.stringify(character));
    setCustomizerStatus("Saved");
  };

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
            <div className="character-stage torso-stage mt-4">
              <div className={`character-hair hair-${hairStyle}`} style={{ backgroundColor: hairColor }} />
              <div className="character-head" style={{ backgroundColor: skinTone }} />
              <div className="character-eyes">
                <span style={{ backgroundColor: eyeColor }} />
                <span style={{ backgroundColor: eyeColor }} />
              </div>
              <div className="character-body" style={{ backgroundColor: shirtColor }} />
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
                <div className="mb-2 text-[10px] uppercase text-zinc-400">Hair Style</div>
                <div className="grid grid-cols-2 gap-2">
                  {HAIR_STYLES.map((style) => (
                    <button
                      key={style}
                      className={`rounded-none border px-2 py-1 text-[10px] uppercase ${
                        hairStyle === style ? "border-zinc-300 bg-zinc-700 text-zinc-50" : "border-zinc-700 bg-zinc-900 text-zinc-300"
                      }`}
                      onClick={() => setHairStyle(style)}
                    >
                      {style}
                    </button>
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
                <div className="mb-2 text-[10px] uppercase text-zinc-400">Eyes</div>
                <div className="flex gap-2">
                  {EYE_COLORS.map((color) => (
                    <button
                      key={color}
                      className="picker-dot"
                      style={{ backgroundColor: color }}
                      onClick={() => setEyeColor(color)}
                      aria-label={`Eyes ${color}`}
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

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  className="rounded-none border border-zinc-700 bg-zinc-900 px-2 py-2 text-[10px] uppercase hover:bg-zinc-800"
                  onClick={randomizeCharacter}
                >
                  Randomize
                </button>
                <button
                  className="rounded-none border border-emerald-300 bg-emerald-500 px-2 py-2 text-[10px] uppercase text-emerald-950 hover:bg-emerald-400"
                  onClick={saveCharacter}
                >
                  Done
                </button>
              </div>
              {customizerStatus ? <div className="text-[10px] uppercase text-zinc-400">{customizerStatus}</div> : null}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

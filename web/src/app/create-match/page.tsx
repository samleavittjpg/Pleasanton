"use client";

import type { SavedCharacter } from "@/lib/auth/types";
import { fetchMe, loginAccount, logoutAccount, registerAccount, saveProfileToServer } from "@/lib/auth-client";
import type { AuthUser } from "@/lib/auth-client";
import { useEffect, useMemo, useState } from "react";
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
  const [doneError, setDoneError] = useState("");

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirm, setAuthConfirm] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const client = useMemo(() => connectClient(), []);
  const randomFrom = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

  const buildCharacter = (): SavedCharacter => ({
    skinTone,
    shirtColor,
    hairColor,
    eyeColor,
    hairStyle,
    displayName: name.trim() || "Anonymous",
  });

  const applyFromProfile = (p: SavedCharacter) => {
    setName(p.displayName);
    setSkinTone(p.skinTone);
    setShirtColor(p.shirtColor);
    setHairColor(p.hairColor);
    setEyeColor(p.eyeColor);
    if ((HAIR_STYLES as readonly string[]).includes(p.hairStyle)) {
      setHairStyle(p.hairStyle as HairStyle);
    }
    localStorage.setItem("pleasantonCharacter", JSON.stringify(p));
    localStorage.setItem("pleasantonPlayerName", p.displayName.trim() || "Anonymous");
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await fetchMe();
        if (cancelled) return;
        if (user) {
          setAuthUser(user);
          if (user.profile) {
            applyFromProfile(user.profile);
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time session restore on mount
  }, []);

  const randomizeCharacter = () => {
    setSkinTone(randomFrom(SKIN_TONES));
    setShirtColor(randomFrom(SHIRT_COLORS));
    setHairColor(randomFrom(HAIR_COLORS));
    setEyeColor(randomFrom(EYE_COLORS));
    setHairStyle(randomFrom(HAIR_STYLES));
    setCustomizerStatus("Randomized");
  };

  const saveCharacterOnly = async () => {
    const character = buildCharacter();
    localStorage.setItem("pleasantonCharacter", JSON.stringify(character));
    localStorage.setItem("pleasantonPlayerName", name.trim() || "Anonymous");
    if (authUser) {
      try {
        await saveProfileToServer(character);
        setCustomizerStatus("Saved to your account");
        return;
      } catch {
        setCustomizerStatus("Saved on this device only (cloud save failed)");
        return;
      }
    }
    setCustomizerStatus("Saved");
  };

  const saveCharacterAndEnterNeighborhood = async () => {
    const character = buildCharacter();
    localStorage.setItem("pleasantonCharacter", JSON.stringify(character));
    localStorage.setItem("pleasantonPlayerName", name.trim() || "Anonymous");
    if (authUser) {
      try {
        await saveProfileToServer(character);
      } catch {
        /* still enter match */
      }
    }
    setCustomizerStatus("Creating match…");
    setDoneError("");
    try {
      const { matchId } = await client.createMatch(lengthMinutes);
      localStorage.setItem("pleasantonMatchId", matchId);
      setCustomizerStatus("Entering neighborhood…");
      router.push(`/match/${matchId}`);
    } catch (e) {
      setCustomizerStatus("");
      setDoneError(e instanceof Error ? e.message : "Could not create match");
    }
  };

  const handleRegister = async () => {
    setAuthError("");
    if (authPassword !== authConfirm) {
      setAuthError("Passwords do not match.");
      return;
    }
    setAuthBusy(true);
    try {
      const user = await registerAccount(authName, authPassword);
      setAuthUser(user);
      setAuthPassword("");
      setAuthConfirm("");
      if (user.profile) {
        applyFromProfile(user.profile);
      }
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Could not create account");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogin = async () => {
    setAuthError("");
    setAuthBusy(true);
    try {
      const user = await loginAccount(authName, authPassword);
      setAuthUser(user);
      setAuthPassword("");
      setAuthConfirm("");
      if (user.profile) {
        applyFromProfile(user.profile);
      }
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Could not sign in");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setAuthBusy(true);
    try {
      await logoutAccount();
      setAuthUser(null);
    } catch {
      /* ignore */
    } finally {
      setAuthBusy(false);
    }
  };

  const inputSky =
    "rounded-none border-2 border-sky-300/80 bg-sky-100 px-3 py-2 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] outline-none placeholder:text-sky-700/60 focus:border-white focus:bg-sky-50";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-300 via-sky-400 to-sky-500 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[6%] top-[10%] h-10 w-28 border-2 border-sky-100 bg-white/90 shadow-[6px_6px_0_rgba(125,211,252,0.75)]" />
        <div className="absolute left-[12%] top-[7%] h-8 w-11 border-2 border-sky-100 bg-white/90" />
        <div className="absolute left-[22%] top-[12%] h-7 w-9 border-2 border-sky-100 bg-white/90" />

        <div className="absolute right-[10%] top-[16%] h-10 w-32 border-2 border-sky-100 bg-white/90 shadow-[6px_6px_0_rgba(125,211,252,0.75)]" />
        <div className="absolute right-[20%] top-[12%] h-8 w-10 border-2 border-sky-100 bg-white/90" />
        <div className="absolute right-[5%] top-[18%] h-7 w-12 border-2 border-sky-100 bg-white/90" />

        <div className="absolute left-1/2 top-[4%] h-8 w-20 -translate-x-1/2 border-2 border-sky-100 bg-white/85" />
        <div className="absolute left-1/2 top-[1%] h-6 w-8 -translate-x-1/2 border-2 border-sky-100 bg-white/85" />
      </div>
      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl uppercase tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
              Create Match
            </h1>
            <div className="mt-2 text-xs text-white/90">Prototype Lobby + Character Setup</div>
          </div>
          <button
            className="rounded-none border-2 border-white/50 bg-white/10 px-3 py-2 text-xs uppercase text-white hover:bg-white/20"
            onClick={() => router.push("/")}
          >
            Back
          </button>
        </div>

        <section className="mt-6 rounded-none border-2 border-white/25 bg-sky-600/20 p-4 backdrop-blur-sm">
          {authLoading ? (
            <p className="text-xs text-white/80">Checking account…</p>
          ) : authUser ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-white/95">
                Signed in as <span className="font-semibold text-white">{authUser.username}</span>
                {authUser.profile ? <span className="text-white/70"> · profile loaded</span> : null}
              </p>
              <button
                type="button"
                disabled={authBusy}
                className="rounded-none border-2 border-white/50 bg-white/10 px-3 py-2 text-[10px] uppercase text-white hover:bg-white/20 disabled:opacity-50"
                onClick={() => void handleLogout()}
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-[1fr,auto] lg:items-end">
              <div className="grid gap-2">
                <div className="flex flex-wrap gap-2 text-[10px] uppercase">
                  <button
                    type="button"
                    className={authMode === "login" ? "text-white underline decoration-white/80" : "text-white/60 hover:text-white/90"}
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError("");
                    }}
                  >
                    Sign in
                  </button>
                  <span className="text-white/35">|</span>
                  <button
                    type="button"
                    className={authMode === "register" ? "text-white underline decoration-white/80" : "text-white/60 hover:text-white/90"}
                    onClick={() => {
                      setAuthMode("register");
                      setAuthError("");
                    }}
                  >
                    Create account
                  </button>
                </div>
                <label className="grid gap-1">
                  <span className="text-[10px] uppercase text-white/80">Username</span>
                  <input
                    className={inputSky}
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="your_name"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="username"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] uppercase text-white/80">Password</span>
                  <input
                    type="password"
                    className={inputSky}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  />
                </label>
                {authMode === "register" ? (
                  <label className="grid gap-1">
                    <span className="text-[10px] uppercase text-white/80">Confirm password</span>
                    <input
                      type="password"
                      className={inputSky}
                      value={authConfirm}
                      onChange={(e) => setAuthConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                  </label>
                ) : null}
                {authError ? <p className="text-[10px] text-rose-200">{authError}</p> : null}
              </div>
              <button
                type="button"
                disabled={authBusy}
                className="rounded-none border-2 border-emerald-300 bg-emerald-500 px-4 py-2.5 text-xs font-medium uppercase text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
                onClick={() => void (authMode === "register" ? handleRegister() : handleLogin())}
              >
                {authMode === "register" ? "Create account" : "Sign in"}
              </button>
            </div>
          )}
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr,320px]">
          <section className="grid gap-6 rounded-none border-2 border-white/25 bg-sky-600/20 p-6 backdrop-blur-sm">
            <label className="grid gap-2">
              <div className="text-xs uppercase text-white/95">Display Name</div>
              <input
                className={inputSky}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="MayorTrashman"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-xs uppercase text-white/95">Create Match Length</div>
                <div className="flex gap-2">
                  {[10, 20, 30].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`rounded-none border-2 px-3 py-2 text-xs ${
                        lengthMinutes === m
                          ? "border-white bg-white text-sky-600"
                          : "border-sky-300/80 bg-sky-100/90 text-slate-800 hover:bg-sky-50"
                      }`}
                      onClick={() => setLengthMinutes(m as 10 | 20 | 30)}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-2 rounded-none border border-emerald-300 bg-emerald-500 px-3 py-2 text-xs text-emerald-950 hover:bg-emerald-400"
                  onClick={async () => {
                    setStatus("Creating match...");
                    try {
                      const character = buildCharacter();
                      localStorage.setItem("pleasantonCharacter", JSON.stringify(character));
                      localStorage.setItem("pleasantonPlayerName", name.trim() || "Anonymous");
                      if (authUser) {
                        try {
                          await saveProfileToServer(character);
                        } catch {
                          /* continue */
                        }
                      }
                      client.send({ type: "client/hello", name });
                      const created = await client.createMatch(lengthMinutes);
                      localStorage.setItem("pleasantonPlayerName", name.trim() || "Anonymous");
                      localStorage.setItem("pleasantonMatchId", created.matchId);
                      setStatus("");
                      router.push(`/match/${created.matchId}`);
                    } catch (e) {
                      setStatus(e instanceof Error ? e.message : "Create failed");
                    }
                  }}
                >
                  Create Match
                </button>
              </div>

              <div className="grid gap-2">
                <div className="text-xs uppercase text-white/95">Join Match</div>
                <input
                  className="rounded-none border-2 border-sky-300/80 bg-sky-100 px-3 py-2 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] outline-none placeholder:text-sky-700/60 focus:border-white focus:bg-sky-50"
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value)}
                  placeholder="match id..."
                />
                <button
                  type="button"
                  className="rounded-none border-2 border-sky-300/90 bg-sky-100/95 px-3 py-2 text-xs text-slate-800 hover:bg-sky-50"
                  onClick={async () => {
                    const code = matchId.trim().toUpperCase();
                    if (!code) return;
                    setStatus("Joining match...");
                    try {
                      const character = buildCharacter();
                      localStorage.setItem("pleasantonCharacter", JSON.stringify(character));
                      localStorage.setItem("pleasantonPlayerName", name.trim() || "Anonymous");
                      if (authUser) {
                        try {
                          await saveProfileToServer(character);
                        } catch {
                          /* continue */
                        }
                      }
                      client.send({ type: "client/hello", name });
                      await client.joinMatch(code);
                      localStorage.setItem("pleasantonPlayerName", name.trim() || "Anonymous");
                      localStorage.setItem("pleasantonMatchId", code);
                      setStatus("");
                      router.push(`/match/${code}`);
                    } catch (e) {
                      setStatus(e instanceof Error ? e.message : "Join failed");
                    }
                  }}
                >
                  Join
                </button>
              </div>
            </div>

            {status ? <div className="text-xs text-white/80">{status}</div> : null}
          </section>

          <aside className="rounded-none border-2 border-white/25 bg-sky-600/20 p-5 backdrop-blur-sm">
            <h2 className="text-xs uppercase text-white/95">Character Prototype</h2>
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
                <div className="mb-2 text-[10px] uppercase text-white/80">Skin</div>
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
                <div className="mb-2 text-[10px] uppercase text-white/80">Hair Style</div>
                <div className="grid grid-cols-2 gap-2">
                  {HAIR_STYLES.map((style) => (
                    <button
                      key={style}
                      type="button"
                      className={`rounded-none border-2 px-2 py-1 text-[10px] uppercase ${
                        hairStyle === style
                          ? "border-white bg-white text-sky-600"
                          : "border-sky-300/80 bg-sky-100/90 text-slate-800 hover:bg-sky-50"
                      }`}
                      onClick={() => setHairStyle(style)}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[10px] uppercase text-white/80">Hair</div>
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
                <div className="mb-2 text-[10px] uppercase text-white/80">Eyes</div>
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
                <div className="mb-2 text-[10px] uppercase text-white/80">Shirt</div>
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
                  type="button"
                  className="rounded-none border-2 border-white/50 bg-white/10 px-2 py-2 text-[10px] uppercase text-white hover:bg-white/20"
                  onClick={randomizeCharacter}
                >
                  Randomize
                </button>
                <button
                  type="button"
                  className="rounded-none border border-emerald-300 bg-emerald-500 px-2 py-2 text-[10px] uppercase text-emerald-950 hover:bg-emerald-400"
                  onClick={() => void saveCharacterAndEnterNeighborhood()}
                >
                  Done
                </button>
              </div>
              {doneError ? <div className="text-[10px] uppercase text-rose-300">{doneError}</div> : null}
              {customizerStatus ? <div className="text-[10px] uppercase text-white/75">{customizerStatus}</div> : null}
              <button
                type="button"
                className="text-[9px] uppercase text-white/70 underline decoration-white/50 hover:text-white"
                onClick={() => void saveCharacterOnly()}
              >
                Save look only (stay here)
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

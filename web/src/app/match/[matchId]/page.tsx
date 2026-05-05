"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function MatchPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = typeof params.matchId === "string" ? params.matchId : "";
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl uppercase tracking-wide">Match</h1>
            <div className="mt-2 text-xs text-zinc-400">Share this id so others can join</div>
          </div>
          <button
            className="rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs uppercase hover:bg-zinc-800"
            onClick={() => router.push("/create-match")}
            type="button"
          >
            Lobby
          </button>
        </div>

        <div className="mt-8 rounded-none border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="text-xs uppercase text-zinc-400">Match id</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="break-all text-sm text-emerald-300">{matchId || "—"}</code>
            <button
              type="button"
              className="rounded-none border border-zinc-600 bg-zinc-950 px-2 py-1 text-xs hover:bg-zinc-900"
              onClick={async () => {
                if (!matchId) return;
                await navigator.clipboard.writeText(matchId);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-6 text-xs text-zinc-500">
            Gameplay UI will land here. For now this confirms your match was created.
          </p>
        </div>
      </main>
    </div>
  );
}

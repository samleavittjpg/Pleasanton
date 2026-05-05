"use client";

import { type ReactNode, useEffect } from "react";

export function Modal(props: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="text-sm font-semibold text-zinc-200">{props.title}</div>
          <button className="rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-900" onClick={props.onClose}>
            Close
          </button>
        </div>
        <div className="p-4">{props.children}</div>
      </div>
    </div>
  );
}


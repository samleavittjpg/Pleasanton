"use client";

import { useRouter } from "next/navigation";

function CloudStrip() {
  return (
    <>
      <div className="absolute left-[6%] top-[10%] h-10 w-28 border-2 border-sky-100 bg-white/90 shadow-[6px_6px_0_rgba(125,211,252,0.75)]" />
      <div className="absolute left-[12%] top-[7%] h-8 w-11 border-2 border-sky-100 bg-white/90" />
      <div className="absolute left-[22%] top-[12%] h-7 w-9 border-2 border-sky-100 bg-white/90" />

      <div className="absolute right-[10%] top-[16%] h-10 w-32 border-2 border-sky-100 bg-white/90 shadow-[6px_6px_0_rgba(125,211,252,0.75)]" />
      <div className="absolute right-[20%] top-[12%] h-8 w-10 border-2 border-sky-100 bg-white/90" />
      <div className="absolute right-[5%] top-[18%] h-7 w-12 border-2 border-sky-100 bg-white/90" />

      <div className="absolute left-1/2 top-[4%] h-8 w-20 -translate-x-1/2 border-2 border-sky-100 bg-white/85" />
      <div className="absolute left-1/2 top-[1%] h-6 w-8 -translate-x-1/2 border-2 border-sky-100 bg-white/85" />
    </>
  );
}

export default function Home() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-300 via-sky-400 to-sky-500 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="landing-clouds-marquee">
          <div className="landing-clouds-strip relative min-h-[220px]">
            <CloudStrip />
          </div>
          <div className="landing-clouds-strip relative min-h-[220px]" aria-hidden>
            <CloudStrip />
          </div>
        </div>
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-10">
        <div className="w-full text-center">
          <h1 className="landing-title mt-4 uppercase">Pleasanton</h1>
          <div className="pixel-kicker mt-4">Neighborhood Builder PvP</div>
          <div className="mt-12">
            <button type="button" className="pixel-btn pixel-btn-primary min-w-52" onClick={() => router.push("/create-match")}>
              Enter game
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

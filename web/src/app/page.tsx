"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="landing-scene min-h-screen text-zinc-100">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-10">
        <div className="w-full text-center">
          <h1 className="landing-title mt-4 uppercase">Pleasanton</h1>
          <div className="pixel-kicker mt-4">Neighborhood Builder PvP</div>
          <div className="mt-12">
            <button
              className="pixel-btn pixel-btn-primary min-w-52"
              onClick={() => router.push("/create-match")}
            >
              Start
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

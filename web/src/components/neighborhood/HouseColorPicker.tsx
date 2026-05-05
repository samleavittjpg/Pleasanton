"use client";

import Image from "next/image";
import type { HouseVariant, HouseVariantId } from "../../lib/houseCatalog";
import { HOUSE_VARIANTS } from "../../lib/houseCatalog";

type Props = {
  onChoose: (id: HouseVariantId) => void;
};

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

export function HouseColorPicker({ onChoose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-sky-300 via-sky-400 to-sky-500 px-4 py-8">
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

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center px-2 text-center">
        <h1 className="landing-title-pick mt-2 uppercase">Pleasanton</h1>
        <div className="pixel-kicker mt-3 max-w-md">Choose your starter home</div>
        <p className="mt-4 text-[10px] leading-relaxed text-sky-950/85 sm:text-xs">
          Everyone gets the same neighborhood layout. Your paint controls the streets around your block — pick the body color for
          your starter homes.
        </p>
      </div>

      <ul className="relative z-10 mt-8 grid max-h-[min(70vh,520px)] w-full max-w-2xl grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-5">
        {HOUSE_VARIANTS.map((v) => (
          <PickerTile key={v.id} variant={v} onChoose={() => onChoose(v.id)} />
        ))}
      </ul>
    </div>
  );
}

function PickerTile({ variant, onChoose }: { variant: HouseVariant; onChoose: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onChoose}
        className="flex w-full flex-col items-center gap-2 rounded-none border-2 border-sky-950/35 bg-white/75 px-2 py-3 shadow-[3px_3px_0_rgb(15_23_42_/_0.25)] transition hover:border-sky-950/55 hover:bg-white/90"
      >
        <span
          className="flex h-14 w-14 items-center justify-center overflow-hidden border-2 border-sky-950/40 bg-white/90"
          style={{ boxShadow: `inset 0 0 0 2px ${variant.accentRgb}44` }}
        >
          <Image
            alt=""
            src={variant.baseSrc}
            width={48}
            height={48}
            unoptimized
            className="max-h-12 w-auto max-w-[48px] object-contain [image-rendering:pixelated]"
          />
        </span>
        <span className="text-[11px] uppercase tracking-wide text-sky-950">{variant.label}</span>
      </button>
    </li>
  );
}

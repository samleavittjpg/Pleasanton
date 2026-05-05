"use client";

import Image from "next/image";
import type { HouseVariant, HouseVariantId } from "../../lib/houseCatalog";
import { HOUSE_VARIANTS } from "../../lib/houseCatalog";

type Props = {
  onChoose: (id: HouseVariantId) => void;
};

export function HouseColorPicker({ onChoose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/97 px-4 py-8">
      <div className="max-w-lg text-center">
        <h2 className="text-lg uppercase tracking-wide text-zinc-100">Choose your house color</h2>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
          Everyone gets the same neighborhood layout. Your paint controls the streets around your block — pick the body color
          for your starter homes.
        </p>
      </div>

      <ul className="mt-8 grid max-h-[min(70vh,520px)] w-full max-w-2xl grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-5">
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
        className="flex w-full flex-col items-center gap-2 rounded-none border border-zinc-700 bg-zinc-900/90 px-2 py-3 transition hover:border-zinc-500 hover:bg-zinc-800/90"
      >
        <span
          className="flex h-14 w-14 items-center justify-center overflow-hidden border border-zinc-600 bg-zinc-950"
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
        <span className="text-[11px] uppercase tracking-wide text-zinc-200">{variant.label}</span>
      </button>
    </li>
  );
}

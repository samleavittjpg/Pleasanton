import Image from "next/image";
import type { HouseVariant } from "../../lib/houseCatalog";

const STREET_BORDER = "0.35rem";

type Props = {
  variant: HouseVariant;
  ownerLabel: string;
  highlight: boolean;
  slotSrcs: (string | null)[];
};

export function NeighborhoodBlock({ variant, ownerLabel, highlight, slotSrcs }: Props) {
  const tint = variant.accentRgb;

  return (
    <section
      className={`relative w-[280px] select-none ${
        highlight ? "z-[1] drop-shadow-[0_12px_0_rgba(0,0,0,0.28)]" : "drop-shadow-[0_10px_0_rgba(0,0,0,0.22)]"
      }`}
      style={{
        // A subtle tinted street edge around the isometric tile.
        padding: STREET_BORDER,
        background: `linear-gradient(135deg, color-mix(in srgb, ${tint} 55%, rgb(82 82 91) 45%), rgb(63 63 70))`,
      }}
    >
      <div
        className="relative h-[190px] w-full overflow-hidden"
        style={{
          background: `linear-gradient(145deg, color-mix(in srgb, ${tint} 14%, rgb(15 23 42)) 0%, rgb(9 9 11) 100%)`,
        }}
      >
        {/* Isometric ground plane */}
        <div
          className="absolute left-1/2 top-1/2 h-[180px] w-[260px] -translate-x-1/2 -translate-y-1/2"
          style={{
            transform: "translate(-50%, -50%) rotate(45deg) scaleY(0.55)",
            border: `2px solid color-mix(in srgb, ${tint} 25%, rgb(63 63 70))`,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.10) 100%)",
          }}
        >
          <div className="grid h-full w-full grid-cols-5 grid-rows-2 gap-1.5 p-2">
            {slotSrcs.map((src, i) => (
              <div
                key={i}
                className="flex aspect-square items-end justify-center border border-zinc-700/80 bg-zinc-950/55 p-0.5"
                title={src ? `Lot ${i + 1}` : `Empty lot ${i + 1}`}
              >
                {src ? (
                  <Image
                    alt=""
                    src={src}
                    width={56}
                    height={56}
                    unoptimized
                    className="max-h-full w-auto object-contain [image-rendering:pixelated]"
                    // Houses will skew a bit with the plane; good enough for v1 iso feel.
                  />
                ) : (
                  <span className="mb-1 text-[7px] uppercase leading-none text-zinc-600">{i + 1}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Labels float above the tile */}
        <div className="absolute left-2 top-2 flex items-center gap-2">
          <span className="max-w-[150px] truncate border border-zinc-800/70 bg-zinc-950/70 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-200">
            {ownerLabel}
          </span>
          {highlight && (
            <span className="border border-amber-300/60 bg-amber-200/10 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-200">
              You
            </span>
          )}
        </div>

        <div className="absolute bottom-2 right-2 border border-zinc-800/70 bg-zinc-950/70 px-2 py-1 text-[9px] uppercase text-zinc-400">
          {slotSrcs.filter(Boolean).length}/10
        </div>
      </div>
    </section>
  );
}

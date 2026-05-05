"use client";

export type House = {
  index: number;
  graffiti01: number;
  trashed01: number;
  foreclosed: boolean;
  graffitiDataUrl?: string;
};

export function TileMap(props: {
  houses: House[];
  onHouseClick: (index: number) => void;
  selectedHouseIndex?: number;
}) {
  // MVP: 10 houses laid out as 5x2, SimCity-ish blocky pixels.
  return (
    <div className="inline-grid grid-cols-5 gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      {props.houses.map((h) => {
        const trash = Math.round(h.trashed01 * 4);
        const graffiti = Math.round(h.graffiti01 * 4);
        const selected = props.selectedHouseIndex === h.index;
        return (
          <button
            key={h.index}
            onClick={() => props.onHouseClick(h.index)}
            className={[
              "relative h-20 w-20 rounded-lg border text-left transition",
              selected ? "border-emerald-400/80" : "border-zinc-700 hover:border-zinc-500",
              h.foreclosed ? "bg-zinc-900 opacity-70" : "bg-zinc-950",
            ].join(" ")}
            title={`House ${h.index + 1}`}
          >
            <div className="absolute inset-2 rounded-md bg-zinc-800" />
            <div className="absolute left-2 top-2 text-[10px] font-semibold text-zinc-200">#{h.index + 1}</div>

            {h.foreclosed ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-amber-200">
                Foreclosed
              </div>
            ) : null}

            <div className="absolute bottom-2 left-2 flex gap-1">
              {Array.from({ length: trash }).map((_, i) => (
                <div key={`t${i}`} className="h-2 w-2 rounded-sm bg-emerald-400/70" />
              ))}
              {Array.from({ length: graffiti }).map((_, i) => (
                <div key={`g${i}`} className="h-2 w-2 rounded-sm bg-fuchsia-400/70" />
              ))}
            </div>

            {h.graffitiDataUrl ? (
              <div className="absolute right-1 top-1 h-8 w-8 overflow-hidden rounded border border-zinc-700 bg-zinc-950">
                <img src={h.graffitiDataUrl} alt="graffiti" className="h-8 w-8 object-cover" />
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}


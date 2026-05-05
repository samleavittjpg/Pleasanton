"use client";

import { Modal } from "../Modal";

export type HouseFamilyInfo = {
  lastName: string;
  dailyMoneyContribution: number;
  dailyAvgTrash: number;
  complaintsPerWeek: number;
  notes: string;
};

export function HouseInfoModal(props: {
  isOpen: boolean;
  onClose: () => void;
  houseSrc: string;
  family: HouseFamilyInfo;
}) {
  if (!props.isOpen) return null;

  const f = props.family;

  return (
    <Modal title={`${f.lastName} family`} onClose={props.onClose}>
      <div className="grid gap-4 md:grid-cols-[220px,1fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            src={props.houseSrc}
            className="mx-auto block h-auto w-full max-w-[200px]"
            style={{ imageRendering: "pixelated" }}
          />
          <div className="mt-3 text-center text-xs text-zinc-400">House preview</div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
            <div className="text-xs uppercase tracking-wide text-zinc-400">Last name</div>
            <div className="mt-1 text-lg font-semibold text-zinc-100">{f.lastName}</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatBox label="Daily money contribution" value={`$${f.dailyMoneyContribution.toFixed(0)}`} />
            <StatBox label="Daily avg trash left out" value={`${f.dailyAvgTrash.toFixed(1)} lbs`} />
            <StatBox label="Complaints / week" value={`${f.complaintsPerWeek.toFixed(0)}`} />
            <StatBox label="HOA status" value={f.complaintsPerWeek >= 4 ? "probation" : "ok"} />
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
            <div className="text-xs uppercase tracking-wide text-zinc-400">Notes</div>
            <div className="mt-1 text-sm leading-relaxed text-zinc-200">{f.notes}</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-100">{value}</div>
    </div>
  );
}


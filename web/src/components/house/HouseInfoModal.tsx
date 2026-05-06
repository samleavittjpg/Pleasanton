"use client";

import { useMemo, useState } from "react";
import { Modal } from "../Modal";

export type HouseFamilyInfo = {
  lastName: string;
  dailyMoneyContribution: number;
  dailyAvgTrash: number;
  complaintsPerWeek: number;
  notes: string;
};

export type TenantApplicant = {
  id: string;
  name: string;
  dailyContribution: number;
  note: string;
  malicious: boolean;
};

export type HouseRuntimeView = {
  occupied: boolean;
  tenant: HouseFamilyInfo | null;
  applicants: TenantApplicant[];
  happiness: number;
  recentIncidents: string[];
};

export function HouseInfoModal(props: {
  isOpen: boolean;
  onClose: () => void;
  houseSrc: string;
  houseLabel: string;
  runtime: HouseRuntimeView;
  canEvict: boolean;
  onEvict: () => void;
  onAcceptApplicant: (applicantId: string) => void;
  onRejectApplicant: (applicantId: string) => void;
}) {
  if (!props.isOpen) return null;
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const runtime = props.runtime;
  const f = runtime.tenant;
  const selectedApplicant = useMemo(
    () => runtime.applicants.find((a) => a.id === selectedApplicantId) ?? runtime.applicants[0] ?? null,
    [runtime.applicants, selectedApplicantId],
  );

  return (
    <Modal title={props.houseLabel} onClose={props.onClose}>
      <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1 md:grid-cols-[220px,1fr]">
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
          <div className="grid gap-3 sm:grid-cols-2">
            <StatBox label="Happiness" value={`${runtime.happiness.toFixed(0)} / 100`} />
            {runtime.occupied ? (
              props.canEvict ? (
                <div className="rounded-lg border border-red-500/40 bg-red-600/15 p-2">
                  <button
                    type="button"
                    className="w-full rounded-md p-1 hover:bg-red-600/15"
                    onClick={props.onEvict}
                    aria-label="Evict tenant"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="" src="/Icons/evicticon.png" className="mx-auto w-[100px] h-auto [image-rendering:pixelated]" />
                  </button>
                </div>
              ) : (
                <div />
              )
            ) : (
              <StatBox label="Applications" value={`${runtime.applicants.length} / 5`} />
            )}
          </div>

          {runtime.occupied && f ? (
            <>
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

              {runtime.recentIncidents.length ? (
                <div className="rounded-lg border border-red-900/70 bg-red-950/20 p-3">
                  <div className="text-xs uppercase tracking-wide text-red-300">Recent incidents</div>
                  <ul className="mt-2 grid max-h-28 gap-1 overflow-y-auto text-xs text-red-200">
                    {runtime.recentIncidents.map((i, idx) => (
                      <li key={`${i}-${idx}`}>- {i}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

            </>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                <div className="text-xs uppercase tracking-wide text-zinc-400">House status</div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">Vacant - awaiting applicants</div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                <div className="text-xs uppercase tracking-wide text-zinc-400">Applicants</div>
                {runtime.applicants.length ? (
                  <div className="mt-2 grid gap-2">
                    {runtime.applicants.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className={`rounded-md border px-2 py-2 text-left text-xs ${
                          selectedApplicant?.id === a.id
                            ? "border-zinc-400 bg-zinc-800 text-zinc-100"
                            : "border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800/70"
                        }`}
                        onClick={() => setSelectedApplicantId(a.id)}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-zinc-400">No applicants yet.</div>
                )}
              </div>

              {selectedApplicant ? (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                  <div className="text-xs uppercase tracking-wide text-zinc-400">Applicant details</div>
                  <div className={`mt-1 text-sm font-semibold ${selectedApplicant.malicious ? "text-red-300" : "text-zinc-100"}`}>
                    {selectedApplicant.name}
                  </div>
                  <div
                    className={`mt-1 text-xs font-medium ${
                      selectedApplicant.malicious || selectedApplicant.dailyContribution < 70 ? "text-red-300" : "text-zinc-200"
                    }`}
                  >
                    Daily contribution: ${selectedApplicant.dailyContribution.toFixed(0)}
                  </div>
                  <div className={`mt-1 text-xs ${selectedApplicant.malicious ? "text-red-300" : "text-zinc-300"}`}>
                    {selectedApplicant.note}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-emerald-500/40 bg-emerald-600/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-600/30"
                      onClick={() => props.onAcceptApplicant(selectedApplicant.id)}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-red-500/40 bg-red-600/15 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-600/25"
                      onClick={() => props.onRejectApplicant(selectedApplicant.id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
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


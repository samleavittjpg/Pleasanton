"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HouseVariantId } from "../../lib/houseCatalog";
import { getHouseVariant, HOUSE_VARIANTS } from "../../lib/houseCatalog";
import { BOARD_PADS } from "../../lib/boardPads";
import { buildDefaultWorld, CENTER_COL, CENTER_ROW } from "../../lib/worldMap";
import { HouseInfoModal, type HouseFamilyInfo, type HouseRuntimeView, type TenantApplicant } from "../house/HouseInfoModal";
import { Modal } from "../Modal";

type Props = {
  playerVariantId: HouseVariantId;
  onNeighborhoodMoodChange?: (value: number) => void;
};

type PlacedHouse = {
  id: string;
  src: string;
  x: number; // world space
  y: number; // world space
  scale: number;
  kind: "base" | "mid" | "full";
  padIndex: number;
  boardId: string;
  outline: string;
  isPlayerTeam: boolean;
};

type MaintenanceTask = {
  id: string;
  kind: "trash" | "routine" | "warning" | "enforce" | "repair_small" | "repair_large";
  label: string;
  cost: number;
  happinessDelta: number;
  escalatesAt?: number;
};

type HouseSessionState = {
  isPlayerTeam: boolean;
  occupied: boolean;
  tenant: HouseFamilyInfo | null;
  tenantMalicious: boolean;
  happiness: number;
  applicants: TenantApplicant[];
  recentIncidents: string[];
  nextApplicantAt: number;
  nextIncidentAt: number;
  trashPileActive: boolean;
  nextTrashSpawnAt: number;
  nextTrashPenaltyAt: number;
  maintenanceTasks: MaintenanceTask[];
  nextRoutineMaintenanceAt: number;
};

type ToastNotice = {
  id: string;
  text: string;
  expiresAt: number;
};
type HappinessPoint = { tSec: number; mood: number };

// This map is intentionally minimal: just the neighborhood pad tile and houses.
const WORLD_W = 2600;
const WORLD_H = 1800;
const MAP_ZOOM_MIN = 0.55;
const MAP_ZOOM_MAX = 1.35;
const MAP_ZOOM_STEP = 0.1;
const DEBUG_PADS = false;
const HOUSE_SCALE = 0.38;
// Move sprites vertically in pixels (obvious + reliable).
const HOUSE_OFFSET_Y_PX = -150;
const DEBUG_HOUSE_ANCHOR = false;
type Pad = { x: number; y: number; scale: number };
// Bring pads closer together on the board (1.0 = exact baked positions).
const PAD_CONTRACT = 0.75;
const HOUSE_ROT_DEG = -1.2;
// Population tuning
const FILL_RATE = 0.62; // fraction of pads that get a house
const LEVEL_WEIGHTS: Array<{ kind: PlacedHouse["kind"]; w: number; scaleMul: number }> = [
  { kind: "base", w: 0.55, scaleMul: 0.96 },
  { kind: "mid", w: 0.30, scaleMul: 1.02 },
  { kind: "full", w: 0.15, scaleMul: 1.08 },
];
const SCALE_BY_KIND: Record<PlacedHouse["kind"], number> = {
  base: 0.96,
  mid: 1.02,
  full: 1.08,
};
const MID_UPGRADE_COST = 500;
const FULL_UPGRADE_COST = 1200;
// Maintenance/investigation tuning (stub values for prototyping).
const WARNING_HAPPINESS_DELTA = 6;
const ENFORCE_HAPPINESS_DELTA = 10;
const WARNING_COST = 0;
const ENFORCE_COST = 250;
const REPAIR_SMALL_COST = 400;
const REPAIR_SMALL_HAPPINESS_DELTA = -3;
const REPAIR_LARGE_COST = 900;
const REPAIR_LARGE_HAPPINESS_DELTA = -6;
const ROUTINE_MAINTENANCE_COST = 150;
const ROUTINE_MAINTENANCE_HAPPINESS_DELTA = 5;

function getPads(): Pad[] {
  const pads: Pad[] = BOARD_PADS.map((p) => ({ ...p, scale: HOUSE_SCALE }));
  const center = pads[4]!;
  if (PAD_CONTRACT >= 0.999) return pads;
  return pads.map((p, i) => {
    if (i === 4) return p;
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return { ...p, x: center.x + dx * PAD_CONTRACT, y: center.y + dy * PAD_CONTRACT };
  });
}

function MoodRow({ label, value, inverse }: { label: string; value: number; inverse?: boolean }) {
  const clamped = Math.max(0, Math.min(100, value));
  const pct = clamped;
  const good = inverse ? clamped <= 30 : clamped >= 70;
  const warn = !good && (inverse ? clamped <= 60 : clamped >= 40);
  const barColor = good ? "#4ade80" : warn ? "#facc15" : "#ef4444";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 w-full border border-zinc-700 bg-zinc-800">
        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
    </div>
  );
}

export function IsoWorldMap({ playerVariantId, onNeighborhoodMoodChange }: Props) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const [didDrag, setDidDrag] = useState(false);

  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [houseSession, setHouseSession] = useState<Record<string, HouseSessionState>>({});
  const [eventFeed, setEventFeed] = useState<ToastNotice[]>([]);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isEndReportOpen, setIsEndReportOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [playerMoney, setPlayerMoney] = useState(5000);
  const [moneyCollectedTotal, setMoneyCollectedTotal] = useState(0);
  const [happinessHistory, setHappinessHistory] = useState<HappinessPoint[]>([{ tSec: 0, mood: 72 }]);
  const [vandalismByNeighbor, setVandalismByNeighbor] = useState<Record<string, number>>({});
  const [playerSlotKinds, setPlayerSlotKinds] = useState<Array<PlacedHouse["kind"] | null>>(() => initPlayerSlotKinds(playerVariantId));
  const [mapZoom, setMapZoom] = useState(1);
  const [moodPanelOpen, setMoodPanelOpen] = useState(false);
  const houseSessionRef = useRef<Record<string, HouseSessionState>>({});
  const gameStartMsRef = useRef<number>(Date.now());

  const bumpMapZoom = (delta: number) => {
    const el = scrollRef.current;
    setMapZoom((z) => {
      const next = Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, Math.round((z + delta) * 100) / 100));
      if (next === z) return z;
      if (!el) return next;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const cw = WORLD_W * z;
      const ch = WORLD_H * z;
      const anchorX = cw > 0 ? (el.scrollLeft + w / 2) / cw : 0.5;
      const anchorY = ch > 0 ? (el.scrollTop + h / 2) / ch : 0.5;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const e = scrollRef.current;
          if (!e) return;
          const nw = WORLD_W * next;
          const nh = WORLD_H * next;
          const maxL = Math.max(0, nw - e.clientWidth);
          const maxT = Math.max(0, nh - e.clientHeight);
          e.scrollLeft = Math.min(maxL, Math.max(0, anchorX * nw - e.clientWidth / 2));
          e.scrollTop = Math.min(maxT, Math.max(0, anchorY * nh - e.clientHeight / 2));
        });
      });
      return next;
    });
  };

  const scene = useMemo(() => {
    const grid = buildDefaultWorld(playerVariantId);
    // Render multiple boards: the same 3x3 ownership layout, each board uses the same 9 pad anchors.
    const boards: Array<{
      id: string;
      ownerLabel: string;
      variantId: HouseVariantId;
      isPlayer: boolean;
      x: number;
      y: number;
      houses: PlacedHouse[];
    }> = [];
    const allHouses: PlacedHouse[] = [];

    // Bring boards close enough that their black borders overlap,
    // which reads as continuous streets between neighborhoods.
    const stepX = 410;
    const stepY = 300;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r]!.length; c++) {
        const cell = grid[r]![c]!;
        const isPlayer = r === CENTER_ROW && c === CENTER_COL;
        // Isometric-ish board placement (diamond grid of boards).
        const x = 820 + (c - r) * stepX;
        const y = 260 + (c + r) * stepY;
        const houses = buildBoardHouses(cell.id, cell.variantId, x, y, isPlayer, isPlayer ? playerSlotKinds : undefined);
        boards.push({
          id: cell.id,
          ownerLabel: cell.ownerLabel,
          variantId: cell.variantId,
          isPlayer,
          x,
          y,
          houses,
        });
        allHouses.push(...houses);
      }
    }
    return { boards, allHouses };
  }, [playerVariantId, playerSlotKinds]);

  useEffect(() => {
    setPlayerSlotKinds(initPlayerSlotKinds(playerVariantId));
  }, [playerVariantId]);

  useEffect(() => {
    const s = scrollRef.current;
    const c = centerRef.current;
    if (!s || !c) return;
    requestAnimationFrame(() => {
      s.scrollTo({
        left: c.offsetLeft + c.offsetWidth / 2 - s.clientWidth / 2,
        top: c.offsetTop + c.offsetHeight / 2 - s.clientHeight / 2,
        behavior: "auto",
      });
    });
  }, [playerVariantId]);

  useEffect(() => {
    setHouseSession((prev) => {
      const next = { ...prev };
      const now = Date.now();
      for (const h of scene.allHouses) {
        if (next[h.id]) continue;
        const baseFamily = familyForHouse(h.boardId, h.padIndex);
        next[h.id] = {
          isPlayerTeam: h.isPlayerTeam,
          occupied: true,
          tenant: baseFamily,
          tenantMalicious: false,
          happiness: tempHappinessScore(baseFamily.dailyAvgTrash, baseFamily.complaintsPerWeek),
          applicants: [],
          recentIncidents: [],
          nextApplicantAt: now + randomInRangeMs(10, 30),
          nextIncidentAt: now + randomInRangeMs(60, 120),
          trashPileActive: false,
          nextTrashSpawnAt: now + randomInRangeMs(60, 90),
          nextTrashPenaltyAt: now + randomInRangeMs(20, 40),
          maintenanceTasks: [],
          nextRoutineMaintenanceAt: now + randomInRangeMs(60, 120),
        };
      }
      return next;
    });
  }, [scene.allHouses]);

  useEffect(() => {
    houseSessionRef.current = houseSession;
  }, [houseSession]);

  const playerBoard = scene.boards.find((b) => b.isPlayer) ?? null;
  const rivalNeighborhoods = useMemo(() => scene.boards.filter((b) => !b.isPlayer).map((b) => b.ownerLabel), [scene.boards]);
  const leaderboardRows = useMemo(() => {
    return scene.boards
      .map((board) => {
        const boardSessions = board.houses.map((h) => houseSession[h.id]).filter(Boolean) as HouseSessionState[];
        const homes = boardSessions.length || 1;
        const avgHappiness = boardSessions.length
          ? Math.round(boardSessions.reduce((sum, s) => sum + s.happiness, 0) / boardSessions.length)
          : 0;
        const occupiedPct = boardSessions.length
          ? Math.round((boardSessions.filter((s) => s.occupied).length / homes) * 100)
          : 0;
        return {
          boardId: board.id,
          ownerLabel: board.ownerLabel,
          isPlayer: board.isPlayer,
          progressScore: Math.round(avgHappiness * 0.7 + occupiedPct * 0.3),
          avgHappiness,
          occupiedPct,
        };
      })
      .sort((a, b) => b.progressScore - a.progressScore);
  }, [houseSession, scene.boards]);
  const playerHouseIds = useMemo(() => new Set((playerBoard?.houses ?? []).map((h) => h.id)), [playerBoard]);
  const playerHomes = useMemo(
    () => (playerBoard?.houses ?? []).map((h) => houseSession[h.id]).filter((h): h is HouseSessionState => Boolean(h)),
    [playerBoard, houseSession],
  );

  useEffect(() => {
    if (!onNeighborhoodMoodChange) return;
    if (playerHomes.length === 0) return;
    const total = playerHomes.reduce((sum, home) => sum + home.happiness, 0);
    onNeighborhoodMoodChange(Math.round(total / playerHomes.length));
  }, [playerHomes, onNeighborhoodMoodChange]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const notices: string[] = [];
      const vandalizers: string[] = [];
      setHouseSession((prev) => {
        const now = Date.now();
        let changed = false;
        const next: Record<string, HouseSessionState> = { ...prev };
        for (const [houseId, s] of Object.entries(prev)) {
          let item = s;

          // Ignore stale player sessions for slots/houses no longer owned or rendered.
          if (item.isPlayerTeam && !playerHouseIds.has(houseId)) {
            if (item.maintenanceTasks.length || item.trashPileActive || item.applicants.length || item.recentIncidents.length) {
              item = {
                ...item,
                occupied: false,
                tenant: null,
                tenantMalicious: false,
                applicants: [],
                recentIncidents: [],
                trashPileActive: false,
                maintenanceTasks: [],
              };
              changed = true;
            }
            if (item !== s) next[houseId] = item;
            continue;
          }

          if (item.occupied && item.applicants.length > 0) {
            item = {
              ...item,
              applicants: [],
            };
            changed = true;
          }

          // Keep "trash needs sweeping" tasks in sync with actual active piles only.
          if (!item.trashPileActive && item.maintenanceTasks.some((t) => t.kind === "trash")) {
            item = {
              ...item,
              maintenanceTasks: item.maintenanceTasks.filter((t) => t.kind !== "trash"),
            };
            changed = true;
          }

          if (item.isPlayerTeam && !item.occupied && item.applicants.length < 5 && now >= item.nextApplicantAt) {
            item = {
              ...item,
              applicants: [...item.applicants, generateApplicant(houseId)],
              nextApplicantAt: now + randomInRangeMs(10, 30),
            };
            changed = true;
          }

          if (item.occupied && now >= item.nextTrashSpawnAt && !item.trashPileActive) {
            const nextTasks = (() => {
              if (!item.isPlayerTeam) return item.maintenanceTasks;
              const hasTrashTask = item.maintenanceTasks.some((t) => t.kind === "trash");
              if (hasTrashTask) return item.maintenanceTasks;
              const trashTask: MaintenanceTask = {
                id: `${houseId}:task:trash:${now}`,
                kind: "trash",
                label: `Trash needs sweeping.`,
                cost: 0,
                happinessDelta: 0,
              };
              return [...item.maintenanceTasks, trashTask];
            })();
            item = {
              ...item,
              trashPileActive: true,
              nextTrashPenaltyAt: now + randomInRangeMs(20, 40),
              nextTrashSpawnAt: now + randomInRangeMs(60, 90),
              maintenanceTasks: nextTasks,
            };
            changed = true;
          }

          if (item.trashPileActive && now >= item.nextTrashPenaltyAt) {
            item = {
              ...item,
              happiness: Math.max(0, item.happiness - 3),
              nextTrashPenaltyAt: now + randomInRangeMs(20, 40),
            };
            if (item.isPlayerTeam) {
              notices.push("Uncleared trash pile lowered neighborhood happiness.");
            }
            changed = true;
          }

          // Escalate pending repairs if the tiny fix wasn't addressed in time.
          if (item.isPlayerTeam) {
            let didEscalate = false;
            const nextTasks: MaintenanceTask[] = item.maintenanceTasks.map((t) => {
              if (t.kind !== "repair_small") return t;
              if (!t.escalatesAt || now < t.escalatesAt) return t;
              didEscalate = true;
              return {
                id: t.id,
                kind: "repair_large",
                label: `Major repairs needed: ${t.label.replace(/^Repairs needed:\s*/i, "")}`,
                cost: REPAIR_LARGE_COST,
                happinessDelta: REPAIR_LARGE_HAPPINESS_DELTA,
              };
            });
            if (didEscalate) {
              item = {
                ...item,
                maintenanceTasks: nextTasks,
                happiness: Math.max(0, item.happiness - 2),
              };
              notices.push("Repairs escalated for a house.");
              changed = true;
            }
          }

          if (item.isPlayerTeam && item.occupied && item.tenantMalicious && now >= item.nextIncidentAt) {
            const incident = randomIncidentScenario();
            const event = incident.text;
            const incidentTask = incidentToMaintenanceTask(houseId, now, incident);
            const nextTasks = incidentTask ? [...item.maintenanceTasks, incidentTask] : item.maintenanceTasks;
            const attackerLabel =
              rivalNeighborhoods.length > 0
                ? rivalNeighborhoods[Math.abs(hash(`${houseId}:${now}`)) % rivalNeighborhoods.length]!
                : "Unknown rival";
            item = {
              ...item,
              happiness: Math.max(0, item.happiness - (5 + (hash(`${houseId}:${now}`) % 8))),
              recentIncidents: [event, ...item.recentIncidents].slice(0, 5),
              nextIncidentAt: now + randomInRangeMs(60, 120),
              maintenanceTasks: nextTasks,
            };
            notices.push(`${event} (${attackerLabel})`);
            vandalizers.push(attackerLabel);
            changed = true;
          }

          // Routine maintenance (keeps tenants happier).
          if (item.isPlayerTeam && item.occupied && now >= item.nextRoutineMaintenanceAt) {
            const hasRoutine = item.maintenanceTasks.some((t) => t.kind === "routine");
            const routineTask: MaintenanceTask = {
              id: `${houseId}:task:routine:${now}`,
              kind: "routine",
              label: `House maintenance due.`,
              cost: ROUTINE_MAINTENANCE_COST,
              happinessDelta: ROUTINE_MAINTENANCE_HAPPINESS_DELTA,
            };
            const nextTasks: MaintenanceTask[] = hasRoutine ? item.maintenanceTasks : [...item.maintenanceTasks, routineTask];
            item = {
              ...item,
              maintenanceTasks: nextTasks,
              nextRoutineMaintenanceAt: now + randomInRangeMs(60, 120),
            };
            changed = true;
          }

          if (item !== s) next[houseId] = item;
        }
        return changed ? next : prev;
      });
      if (notices.length) {
        const now = Date.now();
        const nextNotices = notices.map((text, idx) => ({
          id: `${now}-${idx}-${hash(text)}`,
          text,
          expiresAt: now + 7000,
        }));
        setEventFeed((prev) => [...nextNotices, ...prev].slice(0, 4));
      }
      if (vandalizers.length) {
        setVandalismByNeighbor((prev) => {
          const next = { ...prev };
          for (const label of vandalizers) next[label] = (next[label] ?? 0) + 1;
          return next;
        });
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [playerHouseIds, rivalNeighborhoods]);

  useEffect(() => {
    if (!eventFeed.length) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setEventFeed((prev) => prev.filter((notice) => notice.expiresAt > now));
    }, 500);
    return () => window.clearInterval(id);
  }, [eventFeed.length]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const sessions = houseSessionRef.current;
      const homes = (playerBoard?.houses ?? []).map((h) => sessions[h.id]).filter((h): h is HouseSessionState => Boolean(h));
      if (!homes.length) return;
      const payout = homes.reduce((sum, h) => {
        if (!h.isPlayerTeam || !h.occupied || !h.tenant) return sum;
        return sum + h.tenant.dailyMoneyContribution;
      }, 0);
      if (payout <= 0) return;
      setPlayerMoney((m) => m + payout);
      setMoneyCollectedTotal((m) => m + payout);
      const now = Date.now();
      setEventFeed((prev) => [{ id: `${now}-income`, text: `Collected $${payout} tenant contribution.`, expiresAt: now + 7000 }, ...prev].slice(0, 4));
    }, 30000);
    return () => window.clearInterval(id);
  }, [playerBoard]);

  const selectedHouse = selectedHouseId ? scene.allHouses.find((h) => h.id === selectedHouseId) ?? null : null;
  const selectedSession = selectedHouse ? houseSession[selectedHouse.id] : undefined;
  const selectedRuntime: HouseRuntimeView | null = selectedHouse
    ? {
        occupied: selectedSession?.occupied ?? true,
        tenant: selectedSession?.tenant ?? familyForHouse(selectedHouse.boardId, selectedHouse.padIndex),
        applicants: selectedSession?.applicants ?? [],
        happiness:
          selectedSession?.happiness ??
          tempHappinessScore(
            familyForHouse(selectedHouse.boardId, selectedHouse.padIndex).dailyAvgTrash,
            familyForHouse(selectedHouse.boardId, selectedHouse.padIndex).complaintsPerWeek,
          ),
        recentIncidents: selectedSession?.recentIncidents ?? [],
      }
    : null;
  const neighborhoodMood = useMemo(() => {
    if (!playerHomes.length) return 72;
    const total = playerHomes.reduce((sum, home) => sum + home.happiness, 0);
    return Math.round(total / playerHomes.length);
  }, [playerHomes]);
  const clampedNeighborhoodMood = Math.max(0, Math.min(100, neighborhoodMood));
  const happybarFillColor = clampedNeighborhoodMood <= 25 ? "#ef4444" : "#facc15";
  const HAPPYBAR_POINTS =
    "1837.12 9.98 1837.12 1.5 16.88 1.5 16.88 9.98 1.5 9.98 1.5 47.28 16.88 47.28 16.88 54.06 1837.12 54.06 1837.12 47.28 1852.5 47.28 1852.5 9.98 1837.12 9.98";

  const cleanlinessScore = useMemo(() => {
    if (!playerHomes.length) return 70;
    const dirtyCount = playerHomes.filter((h) => h.trashPileActive).length;
    const ratio = 1 - dirtyCount / playerHomes.length;
    return Math.round(40 + ratio * 60);
  }, [playerHomes]);

  const moneyScore = useMemo(() => {
    if (!playerHomes.length) return 65;
    const avg = playerHomes.reduce((sum, h) => sum + (h.tenant?.dailyMoneyContribution ?? 0), 0) / playerHomes.length || 0;
    const scaled = Math.max(0, Math.min(1, avg / 250));
    return Math.round(40 + scaled * 60);
  }, [playerHomes]);

  const vandalismScore = useMemo(() => {
    if (!playerHomes.length) return 80;
    const incidents = playerHomes.reduce((sum, h) => sum + (h.recentIncidents.length || 0), 0);
    const perHome = incidents / playerHomes.length;
    const clean = Math.max(0, Math.min(1, 1 - perHome / 5));
    return Math.round(40 + clean * 60);
  }, [playerHomes]);
  const maintenanceNeedsAttention = (() => {
    if (!playerBoard) return false;
    for (let i = 0; i < 9; i++) {
      if (!playerSlotKinds[i]) continue;
      const h = playerBoard.houses.find((x) => x.padIndex === i);
      if (!h) continue;
      const s = houseSession[h.id];
      if (!s || !s.isPlayerTeam) continue;
      if (s.maintenanceTasks.length > 0) return true;
    }
    return false;
  })();
  const reportVandalRows = useMemo(
    () => Object.entries(vandalismByNeighbor).sort((a, b) => b[1] - a[1]),
    [vandalismByNeighbor]
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      const tSec = Math.max(0, Math.round((Date.now() - gameStartMsRef.current) / 1000));
      setHappinessHistory((prev) => {
        const last = prev[prev.length - 1];
        if (last && Math.abs(last.mood - neighborhoodMood) < 1 && tSec - last.tSec < 10) return prev;
        return [...prev.slice(-59), { tSec, mood: neighborhoodMood }];
      });
    }, 5000);
    return () => window.clearInterval(id);
  }, [neighborhoodMood]);
  const updatePlayerSlotKind = (slotIdx: number, nextKind: PlacedHouse["kind"]) => {
    const currentKind = playerSlotKinds[slotIdx] ?? null;
    if (currentKind === nextKind) return;
    const happinessGain =
      currentKind == null && nextKind === "base"
        ? 4
        : currentKind === "base" && nextKind === "mid"
          ? 8
          : currentKind === "base" && nextKind === "full"
            ? 14
            : currentKind === "mid" && nextKind === "full"
              ? 8
              : 0;

    setPlayerSlotKinds((prev) => {
      const next = [...prev];
      next[slotIdx] = nextKind;
      return next;
    });

    if (happinessGain > 0 && playerBoard) {
      const slotHouse = playerBoard.houses.find((h) => h.padIndex === slotIdx);
      if (slotHouse) {
        setHouseSession((prev) => {
          const s = prev[slotHouse.id];
          if (!s) return prev;
          return {
            ...prev,
            [slotHouse.id]: {
              ...s,
              happiness: Math.max(0, Math.min(100, s.happiness + happinessGain)),
            },
          };
        });
      }
    }

    const now = Date.now();
    const noticeText =
      happinessGain > 0
        ? `Slot ${slotIdx + 1} upgraded to ${nextKind}. Happiness +${happinessGain}.`
        : `Slot ${slotIdx + 1} upgraded to ${nextKind}.`;
    setEventFeed((prev) => [{ id: `${now}-slot-${slotIdx}-${nextKind}`, text: noticeText, expiresAt: now + 7000 }, ...prev].slice(0, 4));
  };

  const pushToast = (text: string) => {
    const now = Date.now();
    setEventFeed((prev) => [{ id: `${now}-maint-${hash(text)}`, text, expiresAt: now + 7000 }, ...prev].slice(0, 4));
  };

  const resolveMaintenanceTask = (houseId: string, task: MaintenanceTask) => {
    setHouseSession((prev) => {
      const s = prev[houseId];
      if (!s) return prev;
      return {
        ...prev,
        [houseId]: {
          ...s,
          happiness: Math.max(0, Math.min(100, s.happiness + task.happinessDelta)),
          maintenanceTasks: s.maintenanceTasks.filter((t) => t.id !== task.id),
        },
      };
    });
    if (task.cost > 0) {
      setPlayerMoney((m) => Math.max(0, m - task.cost));
    }
    if (task.kind === "warning") pushToast("Warning sent. Happiness increased.");
    else if (task.kind === "enforce") pushToast("Violation enforced. Happiness increased.");
    else if (task.kind === "repair_small") pushToast("Small repair done. Paid for fixes.");
    else if (task.kind === "repair_large") pushToast("Major repair done. Repairs completed.");
    else if (task.kind === "routine") pushToast("Routine maintenance completed.");
  };

  return (
    <div
      ref={scrollRef}
      className="h-full w-full select-none overflow-auto"
      style={{
        cursor: didDrag ? "grabbing" : "grab",
        // Fills letterboxing around the world when the viewport is larger than content.
        backgroundColor: "#1a2618",
      }}
      onPointerDown={(e) => {
        const el = scrollRef.current;
        if (!el) return;
        if (selectedHouseId || isBuyModalOpen || isMaintenanceModalOpen) return;
        // If clicking on a house button, let it handle the click.
        const target = e.target as HTMLElement;
        if (target.closest("[data-modal-root='1']")) return;
        if (target.closest("[data-house-button='1']")) return;
        if (target.closest("[data-ui-button='1']")) return;

        dragRef.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          startLeft: el.scrollLeft,
          startTop: el.scrollTop,
        };
        setDidDrag(false);
        el.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const el = scrollRef.current;
        const d = dragRef.current;
        if (!el || !d || d.pointerId !== e.pointerId) return;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (!didDrag && Math.hypot(dx, dy) > 4) setDidDrag(true);
        if (!didDrag && Math.hypot(dx, dy) <= 4) return;
        el.scrollLeft = d.startLeft - dx;
        el.scrollTop = d.startTop - dy;
      }}
      onPointerUp={(e) => {
        const el = scrollRef.current;
        const d = dragRef.current;
        if (!el || !d || d.pointerId !== e.pointerId) return;
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        dragRef.current = null;
        setTimeout(() => setDidDrag(false), 0);
      }}
      onPointerCancel={(e) => {
        const el = scrollRef.current;
        const d = dragRef.current;
        if (!el || !d || d.pointerId !== e.pointerId) return;
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        dragRef.current = null;
        setDidDrag(false);
      }}
    >
      <div className="pointer-events-none fixed left-1/2 top-6 z-[125] -translate-x-1/2">
        <div className="pointer-events-auto flex flex-col items-center gap-2">
          <button
            type="button"
            data-ui-button="1"
            className="flex cursor-pointer items-center gap-1 rounded bg-zinc-900/70 px-1 py-0 shadow-[2px_2px_0_rgba(0,0,0,0.45)] backdrop-blur-sm"
            onClick={() => setMoodPanelOpen((open) => !open)}
          >
            <div className="relative h-[13px] w-[300px] sm:h-[13px] sm:w-[380px]">
              {/* Filled polygon clipped by width (thickness comes from the filled shape, not the stroke). */}
              <div className="absolute inset-0 bg-zinc-800/80" />
              <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${clampedNeighborhoodMood}%` }}>
                <svg viewBox="0 0 1854 55.56" className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
                  <polygon points={HAPPYBAR_POINTS} fill={happybarFillColor} />
                </svg>
              </div>
              {/* Outline on top for crisp pixel edges */}
              <Image
                src="/happybar.svg"
                alt="Neighborhood mood bar"
                width={200}
                height={32}
                className="absolute inset-0 h-full w-full [image-rendering:pixelated]"
                priority
              />
            </div>
            <div className="text-[9px] uppercase tracking-wide text-amber-300">Mood: {neighborhoodMood}%</div>
            <div className="flex items-center gap-0.5 rounded border border-emerald-500/35 bg-emerald-900/20 px-1 py-0 text-[9px] uppercase tracking-wide text-emerald-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                src="/Icons/Dollar.png"
                draggable={false}
                className="h-14 w-14 select-none [-webkit-user-drag:none] [image-rendering:pixelated]"
              />
              <span>${playerMoney}</span>
            </div>
          </button>
          {moodPanelOpen ? (
            <div className="w-full max-w-xs rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-[11px] text-zinc-100 shadow-[3px_3px_0_rgba(0,0,0,0.6)]">
              <div className="mb-1 text-[10px] font-normal uppercase tracking-wide text-zinc-300">Breakdown</div>
              <div className="space-y-2">
                <MoodRow label="Cleanliness" value={cleanlinessScore} />
                <MoodRow label="Money" value={moneyScore} />
                <MoodRow label="Vandalism" value={vandalismScore} inverse />
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div
        className="relative shrink-0"
        style={{
          width: `${WORLD_W * mapZoom}px`,
          height: `${WORLD_H * mapZoom}px`,
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            width: `${WORLD_W}px`,
            height: `${WORLD_H}px`,
            transform: `scale(${mapZoom})`,
            transformOrigin: "0 0",
          }}
          onDragStart={(e) => e.preventDefault()}
        >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundColor: "#1a2618",
            backgroundImage: "url(/grass-field-bg.png)",
            backgroundRepeat: "repeat",
            backgroundSize: "auto",
          }}
        />
        {/* Layer 1: all boards. Pointer-events disabled so they never block houses. */}
        <div className="absolute inset-0 z-10" style={{ pointerEvents: "none" }}>
          {scene.boards.map((b) => (
            <div
              key={b.id}
              ref={b.isPlayer ? centerRef : undefined}
              className="absolute"
              style={{ left: `${b.x}px`, top: `${b.y}px`, width: 900, height: 900 }}
            >
              <Image
                alt=""
                src="/Neighborhood_v2.png"
                width={900}
                height={900}
                loading={b.isPlayer ? "eager" : "lazy"}
                fetchPriority={b.isPlayer ? "high" : "auto"}
                unoptimized
                draggable={false}
                className="pointer-events-none [image-rendering:pixelated] select-none [-webkit-user-drag:none]"
                style={{ width: "auto", height: "auto" }}
              />

              {/* Labels are visual-only, also non-interactive */}
              <div className="absolute left-3 top-3 z-20 flex items-center gap-2 pointer-events-none">
                <span className="border border-zinc-800/80 bg-zinc-950/70 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-200">
                  {b.ownerLabel}
                </span>
                {b.isPlayer && (
                  <span className="border border-amber-300/60 bg-amber-200/10 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-200">
                    you
                  </span>
                )}
                <span
                  className="h-2.5 w-2.5 border border-white/20"
                  style={{ background: (getHouseVariant(b.variantId) ?? HOUSE_VARIANTS[0]!).accentRgb }}
                  aria-hidden
                />
              </div>
            </div>
          ))}
        </div>

        {/* Layer 2: all houses above all boards. */}
        <div className="absolute inset-0 z-30">
          <MapHouses
            houses={scene.allHouses}
            isPanning={() => didDrag}
            zoom={mapZoom}
            onHouseClick={(houseId) => setSelectedHouseId(houseId)}
            houseSession={houseSession}
            onPileCleaned={(houseId) =>
              setHouseSession((prev) => {
                const s = prev[houseId];
                if (!s || !s.occupied || !s.tenant) return prev;
                return {
                  ...prev,
                  [houseId]: {
                    ...s,
                    trashPileActive: false,
                    maintenanceTasks: s.maintenanceTasks.filter((t) => t.kind !== "trash"),
                    nextTrashSpawnAt: Date.now() + randomInRangeMs(60, 90),
                    tenant: {
                      ...s.tenant,
                      dailyAvgTrash: Math.max(1, s.tenant.dailyAvgTrash - 4),
                    },
                    happiness: Math.min(100, s.happiness + 8),
                  },
                };
              })
            }
          />
        </div>
        </div>
      </div>

      <div className="fixed left-4 top-1/2 z-[120] flex -translate-y-1/2 flex-col items-start gap-1.5" data-ui-button="1">
        <button
          type="button"
          data-ui-button="1"
          className="group transition duration-150 ease-out hover:scale-105 active:scale-95"
          onClick={() => setIsMaintenanceModalOpen(true)}
          aria-label="Open house maintenance menu"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            src={maintenanceNeedsAttention ? "/Icons/maintinanceactive.png" : "/Icons/maintinance.png"}
            draggable={false}
            className={`h-auto w-[72px] select-none transition duration-150 ease-out [-webkit-user-drag:none] [image-rendering:pixelated] group-hover:brightness-110 group-hover:[filter:drop-shadow(0_0_1px_rgba(34,197,94,0.98))_drop-shadow(0_0_3px_rgba(34,197,94,0.92))] group-active:brightness-95 ${maintenanceNeedsAttention ? "ui-attn-shake" : ""}`}
          />
        </button>

        <button
          type="button"
          data-ui-button="1"
          className="group transition duration-150 ease-out hover:scale-105 active:scale-95"
          onClick={() => setIsBuyModalOpen(true)}
          aria-label="Open house buy and upgrade menu"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            src="/Icons/housebuy.png"
            draggable={false}
            className="h-auto w-[72px] select-none transition duration-150 ease-out [-webkit-user-drag:none] [image-rendering:pixelated] group-hover:brightness-110 group-hover:[filter:drop-shadow(0_0_1px_rgba(34,74,180,0.98))_drop-shadow(0_0_3px_rgba(34,74,180,0.92))] group-active:brightness-95"
          />
        </button>

        <button
          type="button"
          data-ui-button="1"
          className="group -ml-[13px] flex h-[100px] w-[100px] items-center justify-center transition duration-150 ease-out hover:scale-105 active:scale-95"
          onClick={() => setMoodPanelOpen((open) => !open)}
          aria-label="Open vandalism overview"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            src="/Icons/Vandalized.png"
            draggable={false}
            className="h-full w-full object-contain select-none transition duration-150 ease-out [-webkit-user-drag:none] [image-rendering:pixelated] group-hover:brightness-110 group-hover:[filter:drop-shadow(0_0_1px_rgba(239,68,68,0.98))_drop-shadow(0_0_3px_rgba(239,68,68,0.92))] group-active:brightness-95"
          />
        </button>

        <button
          type="button"
          data-ui-button="1"
          className="group flex h-[56px] w-[56px] items-center justify-center rounded-md border-2 border-zinc-700 bg-zinc-900/92 p-2 transition duration-150 ease-out hover:scale-105 hover:border-zinc-500 hover:bg-zinc-800 active:scale-95"
          onClick={() => setIsSettingsOpen(true)}
          aria-label="Open settings"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            src="/Icons/settings-svgrepo-com.svg"
            draggable={false}
            className="h-auto w-[36px] select-none transition duration-150 ease-out [-webkit-user-drag:none] [image-rendering:pixelated] group-hover:brightness-110 group-hover:[filter:drop-shadow(0_0_1px_rgba(34,74,180,0.98))_drop-shadow(0_0_3px_rgba(34,74,180,0.92))] group-active:brightness-95"
          />
        </button>
      </div>

      {eventFeed.length ? (
        <div className="fixed bottom-4 right-4 z-[120] w-[360px] space-y-2 pointer-events-none" data-ui-button="1">
          {eventFeed.map((event) => (
            <div
              key={event.id}
              className="border-2 border-zinc-700/90 bg-zinc-900/90 px-3 py-2 text-xs text-zinc-100 shadow-[3px_3px_0_rgba(0,0,0,0.6)] backdrop-blur-sm"
            >
              {event.text}
            </div>
          ))}
        </div>
      ) : null}

      <div
        className="fixed right-4 top-1/2 z-[120] flex -translate-y-1/2 flex-col gap-2"
        data-ui-button="1"
        aria-label="Map zoom controls"
      >
        <button
          type="button"
          data-ui-button="1"
          className="neighborhood-zoom-btn"
          aria-label="Zoom in"
          disabled={mapZoom >= MAP_ZOOM_MAX - 1e-6}
          onClick={() => bumpMapZoom(MAP_ZOOM_STEP)}
        >
          +
        </button>
        <button
          type="button"
          data-ui-button="1"
          className="neighborhood-zoom-btn"
          aria-label="Zoom out"
          disabled={mapZoom <= MAP_ZOOM_MIN + 1e-6}
          onClick={() => bumpMapZoom(-MAP_ZOOM_STEP)}
        >
          −
        </button>
      </div>

      <HouseInfoModal
        isOpen={!!selectedHouse && !!selectedRuntime}
        onClose={() => setSelectedHouseId(null)}
        houseSrc={selectedHouse?.src ?? ""}
        houseLabel={selectedHouse ? `${familyForHouse(selectedHouse.boardId, selectedHouse.padIndex).lastName} family (House #${selectedHouse.padIndex + 1})` : "House"}
        canEvict={selectedHouse?.isPlayerTeam ?? false}
        runtime={
          selectedRuntime ?? {
            occupied: true,
            tenant: null,
            applicants: [],
            happiness: 0,
            recentIncidents: [],
          }
        }
        onEvict={() => {
          if (!selectedHouse) return;
          setHouseSession((prev) => {
            const s = prev[selectedHouse.id];
            if (!s || !s.isPlayerTeam) return prev;
            return {
              ...prev,
              [selectedHouse.id]: {
                ...s,
                occupied: false,
                tenant: null,
                tenantMalicious: false,
                trashPileActive: false,
                maintenanceTasks: [],
                nextRoutineMaintenanceAt: Date.now() + randomInRangeMs(60, 120),
                nextApplicantAt: Date.now() + randomInRangeMs(10, 30),
              },
            };
          });
        }}
        onAcceptApplicant={(applicantId) => {
          if (!selectedHouse) return;
          setHouseSession((prev) => {
            const s = prev[selectedHouse.id];
            if (!s) return prev;
            const applicant = s.applicants.find((a) => a.id === applicantId);
            if (!applicant) return prev;
            const tenant: HouseFamilyInfo = {
              lastName: applicant.name.split(" ").slice(-1)[0] ?? applicant.name,
              dailyMoneyContribution: applicant.dailyContribution,
              dailyAvgTrash: applicant.malicious ? 20 + (hash(applicant.id) % 10) : 6 + (hash(applicant.id) % 10),
              complaintsPerWeek: applicant.malicious ? 3 + (hash(applicant.id) % 3) : hash(applicant.id) % 2,
              notes: applicant.note,
            };
            return {
              ...prev,
              [selectedHouse.id]: {
                ...s,
                occupied: true,
                tenant,
                tenantMalicious: applicant.malicious,
                applicants: [],
                recentIncidents: [],
                maintenanceTasks: [],
                happiness: applicant.malicious ? Math.max(20, s.happiness - 10) : Math.min(100, s.happiness + 5),
                nextIncidentAt: Date.now() + randomInRangeMs(60, 120),
                nextTrashSpawnAt: Date.now() + randomInRangeMs(60, 90),
                nextRoutineMaintenanceAt: Date.now() + randomInRangeMs(60, 120),
              },
            };
          });
        }}
        onRejectApplicant={(applicantId) => {
          if (!selectedHouse) return;
          setHouseSession((prev) => {
            const s = prev[selectedHouse.id];
            if (!s) return prev;
            return {
              ...prev,
              [selectedHouse.id]: {
                ...s,
                applicants: s.applicants.filter((a) => a.id !== applicantId),
                nextApplicantAt: Date.now() + randomInRangeMs(10, 30),
              },
            };
          });
        }}
      />

      {isSettingsOpen ? (
        <Modal title="Settings" onClose={() => setIsSettingsOpen(false)}>
          <div className="space-y-3 text-xs text-zinc-200">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-md border border-red-500/40 bg-red-600/20 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-600/30"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setShowLeaderboard(false);
                  setIsEndReportOpen(true);
                }}
              >
                End game
              </button>
              <button
                type="button"
                className="rounded-md border border-sky-500/40 bg-sky-600/20 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-600/30"
                onClick={() => setShowLeaderboard((v) => !v)}
              >
                Leaderboard
              </button>
            </div>

            {showLeaderboard ? (
              <div className="max-h-[45vh] overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900/40 p-2">
                <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-300">Neighborhood progress</div>
                <div className="space-y-2">
                  {leaderboardRows.map((row, idx) => (
                    <div
                      key={row.boardId}
                      className={`rounded border px-2 py-1.5 ${row.isPlayer ? "border-amber-400/50 bg-amber-900/20" : "border-zinc-700 bg-zinc-900/40"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wide text-zinc-100">
                          #{idx + 1} {row.ownerLabel}
                          {row.isPlayer ? " (you)" : ""}
                        </span>
                        <span className="text-[11px] text-zinc-300">{row.progressScore}%</span>
                      </div>
                      <div className="mt-1 text-[10px] text-zinc-400">Mood {row.avgHappiness}% · Occupied {row.occupiedPct}%</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {isEndReportOpen ? (
        <Modal title="End game report" onClose={() => setIsEndReportOpen(false)}>
          <div className="space-y-3 text-xs text-zinc-200">
            <div className="rounded-md border border-zinc-700 bg-zinc-900/40 p-2">
              <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-300">Neighborhood happiness over time</div>
              <svg viewBox="0 0 320 120" className="h-[120px] w-full rounded border border-zinc-700 bg-zinc-950/70" preserveAspectRatio="none">
                <line x1="8" y1="108" x2="312" y2="108" stroke="#3f3f46" strokeWidth="1" />
                <line x1="8" y1="8" x2="8" y2="108" stroke="#3f3f46" strokeWidth="1" />
                {happinessHistory.length > 1 ? (
                  <polyline
                    fill="none"
                    stroke="#facc15"
                    strokeWidth="2"
                    points={happinessHistory
                      .map((p, i) => {
                        const x = 8 + (i / Math.max(1, happinessHistory.length - 1)) * 304;
                        const y = 108 - (Math.max(0, Math.min(100, p.mood)) / 100) * 100;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                ) : null}
              </svg>
              <div className="mt-1 text-[10px] text-zinc-400">Current mood: {neighborhoodMood}%</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-zinc-700 bg-zinc-900/40 p-2">
                <div className="text-[10px] uppercase tracking-wide text-zinc-400">Money collected</div>
                <div className="mt-1 text-sm font-semibold text-emerald-300">${moneyCollectedTotal}</div>
              </div>
              <div className="rounded-md border border-zinc-700 bg-zinc-900/40 p-2">
                <div className="text-[10px] uppercase tracking-wide text-zinc-400">Final progress</div>
                <div className="mt-1 text-sm font-semibold text-amber-300">{clampedNeighborhoodMood}%</div>
              </div>
            </div>

            <div className="rounded-md border border-zinc-700 bg-zinc-900/40 p-2">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-400">Who vandalized your houses</div>
              {reportVandalRows.length ? (
                <div className="space-y-1">
                  {reportVandalRows.map(([label, count]) => (
                    <div key={label} className="flex items-center justify-between text-[11px]">
                      <span>{label}</span>
                      <span className="text-red-300">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-zinc-400">No vandalism incidents recorded.</div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700"
                onClick={() => setIsEndReportOpen(false)}
              >
                Back
              </button>
              <button
                type="button"
                className="rounded-md border border-red-500/40 bg-red-600/20 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-600/30"
                onClick={() => {
                  setIsEndReportOpen(false);
                  router.push("/create-match");
                }}
              >
                Exit to lobby
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {isMaintenanceModalOpen ? (
        <Modal title="House Maintenance" onClose={() => setIsMaintenanceModalOpen(false)}>
          <div className="mb-3 text-xs text-zinc-400">Player money: ${playerMoney}</div>
          <div className="grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2">
            {Array.from({ length: 9 }, (_, idx) => {
              const slotKind = playerSlotKinds[idx] ?? null;
              const slotHouse = slotKind ? playerBoard?.houses.find((h) => h.padIndex === idx) ?? null : null;
              const session = slotKind && slotHouse ? houseSession[slotHouse.id] : undefined;
              const tasks = session?.maintenanceTasks ?? [];
              const incidentTasks = tasks.filter((t) => t.kind === "warning" || t.kind === "enforce" || t.kind === "repair_small" || t.kind === "repair_large");
              const routineTasks = tasks.filter((t) => t.kind === "routine");
              const trashTasks = session?.trashPileActive ? tasks.filter((t) => t.kind === "trash") : [];

              return (
                <div key={`maint-slot-${idx}`} className="flex min-h-[220px] flex-col rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-xs uppercase tracking-wide text-zinc-400">House #{idx + 1}</div>
                    <div className="text-xs font-semibold text-zinc-200">{slotKind ? `${slotKind} tier` : "Empty lot"}</div>
                  </div>

                  {incidentTasks.length ? (
                    <div className="mt-3 rounded-md border border-amber-500/25 bg-amber-900/20 p-2">
                      <div className="text-[11px] uppercase tracking-wide text-amber-200">House #{idx + 1} incident</div>
                      <div className="mt-2 space-y-2">
                        {incidentTasks.map((task) => (
                          <div key={task.id} className="space-y-1">
                            <div className="text-xs text-zinc-200">{task.label}</div>
                            {task.kind === "warning" ? (
                              <button
                                type="button"
                                className="rounded-md border border-emerald-500/40 bg-emerald-600/20 px-2 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-600/30"
                                onClick={() => slotHouse && resolveMaintenanceTask(slotHouse.id, task)}
                              >
                                Send warning
                              </button>
                            ) : null}
                            {task.kind === "enforce" ? (
                              <button
                                type="button"
                                className="rounded-md border border-emerald-500/40 bg-emerald-600/20 px-2 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-600/30"
                                onClick={() => slotHouse && resolveMaintenanceTask(slotHouse.id, task)}
                              >
                                Enforce violation (${task.cost})
                              </button>
                            ) : null}
                            {task.kind === "repair_small" ? (
                              <button
                                type="button"
                                className="rounded-md border border-amber-500/40 bg-amber-600/20 px-2 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-600/30"
                                onClick={() => slotHouse && resolveMaintenanceTask(slotHouse.id, task)}
                              >
                                Repair (small) - ${task.cost}
                              </button>
                            ) : null}
                            {task.kind === "repair_large" ? (
                              <button
                                type="button"
                                className="rounded-md border border-red-500/40 bg-red-600/20 px-2 py-1 text-xs font-semibold text-red-200 hover:bg-red-600/30"
                                onClick={() => slotHouse && resolveMaintenanceTask(slotHouse.id, task)}
                              >
                                Repair (major) - ${task.cost}
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {routineTasks.length ? (
                    <div className="mt-3 rounded-md border border-cyan-500/25 bg-cyan-900/20 p-2">
                      <div className="text-[11px] uppercase tracking-wide text-cyan-200">House #{idx + 1} maintenance</div>
                      <div className="mt-2 space-y-2">
                        {routineTasks.map((task) => (
                          <div key={task.id} className="flex items-center justify-between gap-2">
                            <div className="text-xs text-zinc-200">{task.label}</div>
                            <button
                              type="button"
                              className="rounded-md border border-cyan-500/40 bg-cyan-600/20 px-2 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-600/30"
                              onClick={() => slotHouse && resolveMaintenanceTask(slotHouse.id, task)}
                            >
                              Fix - ${task.cost}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {trashTasks.length ? (
                    <div className="mt-3 rounded-md border border-red-500/25 bg-red-900/20 p-2">
                      <div className="text-[11px] uppercase tracking-wide text-red-200">House #{idx + 1} trash</div>
                      <div className="mt-2 text-xs text-zinc-200">{trashTasks[0]!.label}</div>
                    </div>
                  ) : null}

                  {!tasks.length ? <div className="mt-3 text-xs text-zinc-400">All clear.</div> : <div className="mt-auto" />}
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-zinc-400">Prototype: repairs and upgrades are applied instantly.</div>
        </Modal>
      ) : null}

      {isBuyModalOpen ? (
        <div className="fixed right-4 top-4 z-[140] w-[min(520px,calc(100vw-2rem))]" data-ui-button="1">
          <div className="rounded-md border border-zinc-700 bg-zinc-950/92 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-zinc-200">House Buy / Upgrade</div>
              <button
                type="button"
                data-ui-button="1"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                onClick={() => setIsBuyModalOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {playerSlotKinds.map((kind, idx) => {
                  const canUpgradeToMid = kind === "base";
                  const canUpgradeToFull = kind === "base" || kind === "mid";
                  return (
                    <div key={`buy-slot-${idx}`} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                      <div className="text-xs uppercase tracking-wide text-zinc-400">Slot {idx + 1}</div>
                      <div className="mt-1 text-sm font-semibold text-zinc-100">{kind ? `${kind} house` : "Empty lot"}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {!kind ? (
                          <button
                            type="button"
                            data-ui-button="1"
                            className="rounded-md border border-cyan-500/40 bg-cyan-600/20 px-2 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-600/30"
                            onClick={() => updatePlayerSlotKind(idx, "base")}
                          >
                            Buy Base (temp free)
                          </button>
                        ) : null}
                        {canUpgradeToMid ? (
                          <button
                            type="button"
                            data-ui-button="1"
                            className="rounded-md border border-amber-500/40 bg-amber-600/20 px-2 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-600/30"
                            onClick={() => updatePlayerSlotKind(idx, "mid")}
                          >
                            Upgrade to Mid (${MID_UPGRADE_COST})
                          </button>
                        ) : null}
                        {canUpgradeToFull ? (
                          <button
                            type="button"
                            data-ui-button="1"
                            className="rounded-md border border-emerald-500/40 bg-emerald-600/20 px-2 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-600/30"
                            onClick={() => updatePlayerSlotKind(idx, "full")}
                          >
                            Upgrade to Full (${FULL_UPGRADE_COST})
                          </button>
                        ) : null}
                        {kind === "full" ? <span className="text-xs font-semibold text-emerald-300">Maxed out</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-xs text-zinc-400">Temporary economy mode: upgrades are always allowed for prototyping.</div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}

function buildBoardHouses(
  boardId: string,
  variantId: HouseVariantId,
  boardX: number,
  boardY: number,
  isPlayerTeam: boolean,
  playerSlots?: Array<PlacedHouse["kind"] | null>,
): PlacedHouse[] {
  const accent = (getHouseVariant(variantId) ?? HOUSE_VARIANTS[0]!).accentRgb;
  const outline = brightenHex(accent, 0.55);

  const pads = getPads();
  const houses: PlacedHouse[] = [];

  if (isPlayerTeam && playerSlots) {
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i]!;
      const kind = playerSlots[i] ?? null;
      if (!kind) continue;
      houses.push({
        id: `board-${boardId}-${variantId}-${i}`,
        src: houseSrcForKind(variantId, kind),
        x: boardX + p.x,
        y: boardY + p.y,
        scale: p.scale * SCALE_BY_KIND[kind],
        kind,
        padIndex: i,
        boardId,
        outline,
        isPlayerTeam,
      });
    }
    return houses;
  }

  for (let i = 0; i < pads.length; i++) {
    const p = pads[i]!;
    const rng = makeRng(`${boardId}:${variantId}:${i}`);
    if (rng() > FILL_RATE) continue;

    const pick = weightedPick(LEVEL_WEIGHTS, rng);
    houses.push({
      id: `board-${boardId}-${variantId}-${i}`,
      src: houseSrcForKind(variantId, pick.kind),
      x: boardX + p.x,
      y: boardY + p.y,
      scale: p.scale * pick.scaleMul,
      kind: pick.kind,
      padIndex: i,
      boardId,
      outline,
      isPlayerTeam,
    });
  }

  return houses;
}

function MapHouses({
  houses,
  onHouseClick,
  isPanning,
  zoom,
  houseSession,
  onPileCleaned,
}: {
  houses: PlacedHouse[];
  onHouseClick: (houseId: string) => void;
  isPanning: () => boolean;
  zoom: number;
  houseSession: Record<string, HouseSessionState>;
  onPileCleaned: (houseId: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [trashPileClicks, setTrashPileClicks] = useState<Record<string, number>>({});
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: -9999, y: -9999 });
  const hoverRaf = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoveredRef = useRef<string | null>(null);
  hoveredRef.current = hoveredId;
  const hoveredHouse = hoveredId ? houses.find((x) => x.id === hoveredId) ?? null : null;
  const hoveredClicksDone = hoveredHouse ? (trashPileClicks[hoveredHouse.id] ?? 0) : 0;
  const hoveredRequiredClicks = hoveredHouse ? trashPileClicksRequired(hoveredHouse.id) : 0;
  const hoveredActivePile =
    hoveredHouse && hoveredHouse.isPlayerTeam
      ? houseTrashPileFor(hoveredHouse, hoveredClicksDone >= hoveredRequiredClicks, houseSession[hoveredHouse.id])
      : null;
  const broomCursor = hoveredClicksDone % 2 === 0 ? "/Icons/broom1.png" : "/Icons/broom2.png";

  // Cache decoded image alpha per src.
  const alphaCache = useRef(
    new Map<
      string,
      Promise<{
        width: number;
        height: number;
        data: Uint8ClampedArray;
      }>
    >()
  );

  const getAlphaData = (src: string) => {
    const cached = alphaCache.current.get(src);
    if (cached) return cached;
    const p = (async () => {
      const res = await fetch(src);
      const blob = await res.blob();
      const bmp = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2d context not available");
      ctx.drawImage(bmp, 0, 0);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return { width: img.width, height: img.height, data: img.data };
    })();
    alphaCache.current.set(src, p);
    return p;
  };

  function hitTestHousePixel(h: PlacedHouse, localX: number, localY: number) {
    // Convert board-local mouse coords into house-local box coords (before translate(-50%,-50%)).
    const size = Math.round(512 * h.scale);
    const left = h.x - size / 2;
    const top = h.y + HOUSE_OFFSET_Y_PX - size / 2;
    const x = localX - left;
    const y = localY - top;
    if (x < 0 || y < 0 || x >= size || y >= size) return Promise.resolve(false);

    // Undo the small visual rotation so hit testing matches what you see.
    const angle = (-HOUSE_ROT_DEG * Math.PI) / 180; // inverse rotation
    const cx = size / 2;
    const cy = size / 2;
    const dx = x - cx;
    const dy = y - cy;
    const rx = dx * Math.cos(angle) - dy * Math.sin(angle) + cx;
    const ry = dx * Math.sin(angle) + dy * Math.cos(angle) + cy;
    if (rx < 0 || ry < 0 || rx >= size || ry >= size) return Promise.resolve(false);

    return getAlphaData(h.src).then(({ width, height, data }) => {
      const px = Math.floor((rx / size) * width);
      const py = Math.floor((ry / size) * height);
      const idx = (py * width + px) * 4 + 3;
      const a = data[idx] ?? 0;
      return a > 10;
    });
  }

  const scheduleHoverUpdate = (clientX: number, clientY: number) => {
    if (hoverRaf.current != null) cancelAnimationFrame(hoverRaf.current);
    hoverRaf.current = requestAnimationFrame(async () => {
      const root = containerRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const x = (clientX - rect.left) / zoom;
      const y = (clientY - rect.top) / zoom;

      // Check topmost-first by "depth" (y) so foreground wins.
      const sorted = [...houses].sort((a, b) => (b.y - a.y) || b.padIndex - a.padIndex);
      for (const h of sorted) {
        // eslint-disable-next-line no-await-in-loop
        const hit = await hitTestHousePixel(h, x, y);
        if (hit) {
          if (hoveredRef.current !== h.id) setHoveredId(h.id);
          return;
        }
      }
      if (hoveredRef.current !== null) setHoveredId(null);
    });
  };

  useEffect(() => {
    return () => {
      if (hoverRaf.current != null) cancelAnimationFrame(hoverRaf.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute left-0 top-0"
      onPointerMove={(e) => scheduleHoverUpdate(e.clientX, e.clientY)}
      onPointerLeave={() => setHoveredId(null)}
      onPointerDown={(e) => {
        // If clicking on a house pixel (not just the bounding box), open the modal.
        // We reuse the hoveredId calculated by hit-testing.
        const id = hoveredRef.current;
        if (!id) return;
        if (isPanning()) return;
        const h = houses.find((x) => x.id === id);
        if (!h) return;
        const clicksDone = trashPileClicks[h.id] ?? 0;
        const requiredClicks = trashPileClicksRequired(h.id);
        const activePile = h.isPlayerTeam && houseTrashPileFor(h, clicksDone >= requiredClicks, houseSession[h.id]);
        if (activePile) {
          const nextClicks = clicksDone + 1;
          if (nextClicks >= requiredClicks) {
            onPileCleaned(h.id);
            // Reset cleanup progress so future trash spawns on this house can be swept normally.
            setTrashPileClicks((prev) => ({ ...prev, [h.id]: 0 }));
          } else {
            setTrashPileClicks((prev) => ({ ...prev, [h.id]: nextClicks }));
          }
          e.preventDefault();
          return;
        }
        onHouseClick(h.id);
        e.preventDefault();
      }}
      style={{
        touchAction: "none",
        cursor: hoveredActivePile ? "none" : undefined,
      }}
      onMouseMove={(e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setMousePos({ x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom });
      }}
    >
      {DEBUG_HOUSE_ANCHOR && (
        <div className="absolute left-0 top-0 z-20 h-full w-full pointer-events-none">
          <div className="absolute left-0 right-0 border-t-2 border-amber-300/80" style={{ top: `${450}px` }} />
        </div>
      )}
      {DEBUG_PADS &&
        getPads().map((p, i) => (
          <div
            key={`pad-${i}`}
            className="absolute h-3 w-3 rounded-full bg-fuchsia-400"
            style={{ left: `${p.x}px`, top: `${p.y}px`, transform: "translate(-50%, -50%)" }}
            title={`pad ${i}`}
          />
        ))}

      {houses.map((h) => (
        (() => {
          const clicksDone = trashPileClicks[h.id] ?? 0;
          const requiredClicks = trashPileClicksRequired(h.id);
          const session = houseSession[h.id];
          const activePile = houseTrashPileFor(h, h.isPlayerTeam ? clicksDone >= requiredClicks : false, houseSession[h.id]);
          const hasApplicantAlert = h.isPlayerTeam && session?.occupied === false && (session?.applicants.length ?? 0) > 0;
          const hasIncidentAlert =
            h.isPlayerTeam &&
            (session?.maintenanceTasks.some((t) => t.kind === "warning" || t.kind === "enforce" || t.kind === "repair_small" || t.kind === "repair_large") ?? false);
          const alertIcons: string[] = [];
          if (h.isPlayerTeam && activePile) alertIcons.push("/Icons/exclamationicon.png");
          if (hasApplicantAlert) alertIcons.push("/Icons/tenanticon.png");
          if (hasIncidentAlert) alertIcons.push("/Icons/exclamationicon.png");
          const visibleAlertIcons = alertIcons.slice(0, 3);
          return (
        <div
          key={h.id}
          data-house-button="1"
          className="absolute"
          style={{
            left: `${h.x}px`,
            top: `${h.y + HOUSE_OFFSET_Y_PX}px`,
            // Keep a stable depth order for visuals; hover/click uses pixel hit-test.
            zIndex: 10 + Math.round(h.y),
            transform: "translate(-50%, -50%)",
            transformOrigin: "50% 50%",
          }}
        >
          <div
            className="relative"
            style={{
              width: `${Math.round(512 * h.scale)}px`,
              height: `${Math.round(512 * h.scale)}px`,
              transform: `rotate(${HOUSE_ROT_DEG}deg)`,
              pointerEvents: "none",
            }}
          >
            {hoveredId === h.id ? (
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: h.outline,
                  // Use the sprite itself as a mask, then slightly scale up for a clean outline.
                  WebkitMaskImage: `url(${h.src})`,
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  WebkitMaskSize: "contain",
                  maskImage: `url(${h.src})`,
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                  maskSize: "contain",
                  transform: "scale(1.06)",
                  transformOrigin: "50% 50%",
                  opacity: 0.98,
                }}
              />
            ) : null}

            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${h.src})`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "contain",
                imageRendering: "pixelated",
              }}
            />

            <>
              {houseBinsFor(h).map((bin, idx) => (
                <div
                  key={`bin-${h.id}-${idx}`}
                  className="absolute"
                  style={{
                    left: `${Math.round(bin.x * h.scale)}px`,
                    top: `${Math.round(bin.y * h.scale)}px`,
                    width: `${Math.round(bin.w * h.scale)}px`,
                    height: `${Math.round(bin.h * h.scale)}px`,
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none",
                    backgroundImage: `url(${bin.src})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "contain",
                    imageRendering: "pixelated",
                  }}
                />
              ))}

              {activePile ? (
                <div
                  className="absolute"
                  style={{
                    left: `${Math.round(activePile.x * h.scale)}px`,
                    top: `${Math.round(activePile.y * h.scale)}px`,
                    width: `${Math.round(activePile.w * h.scale)}px`,
                    height: `${Math.round(activePile.h * h.scale)}px`,
                    transform: "translate(-50%, -50%)",
                    backgroundImage: `url(${activePile.src})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "contain",
                    imageRendering: "pixelated",
                    // Keep spawned trash piles visibly highlighted by team color.
                    filter: `drop-shadow(0 0 1px ${h.outline}) drop-shadow(0 0 6px ${h.outline})`,
                    pointerEvents: "none",
                  }}
                />
              ) : null}
            </>
          </div>

          {visibleAlertIcons.map((iconSrc, idx) => (
            <div
              key={`alert-${h.id}-${idx}`}
              className="trash-alert-bob absolute"
              aria-hidden
              style={{
                left: `${Math.round(512 * h.scale * (0.28 + idx * 0.14))}px`,
                top: `${Math.round(512 * h.scale * 0.08)}px`,
                width: `${Math.max(28, Math.round(72 * h.scale))}px`,
                height: `${Math.max(28, Math.round(72 * h.scale))}px`,
                transform: "translate(-50%, -50%)",
                backgroundImage: `url('${iconSrc}')`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "contain",
                imageRendering: "pixelated",
                pointerEvents: "none",
              }}
            />
          ))}
        </div>
          );
        })()
      ))}

      {hoveredActivePile ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: `${Math.round(mousePos.x)}px`,
            top: `${Math.round(mousePos.y)}px`,
            width: "100px",
            height: "100px",
            // Hotspot stays at OS cursor tip; nudge sprite up/left so the wide bristles sit roughly
            // where the default pointer arrow's body would read (instead of centered on tip).
            transform: "translate(-26px, -48px)",
            backgroundImage: `url('${broomCursor}')`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "contain",
            imageRendering: "pixelated",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        />
      ) : null}
    </div>
  );
}

type TrashSprite = { src: string; x: number; y: number; w: number; h: number };

const LIGHT_BINS = ["/bins/lightbin1.png", "/bins/lightbin2.png", "/bins/lightbin3.png"] as const;
const MEDIUM_BINS = ["/bins/mediumbin1.png", "/bins/mediumbin2.png", "/bins/mediumbin3.png"] as const;
const LARGE_BINS = [
  "/bins/largebin1.png",
  "/bins/largebin2.png",
  "/bins/largebin3.png",
  "/bins/largebin4.png",
  "/bins/largebin5.png",
  "/bins/largebin6.png",
] as const;
const EXTRA_LARGE_BINS = [
  "/bins/extralargebin1.png",
  "/bins/extralargebin2.png",
  "/bins/extralargebin3.png",
  "/bins/extralargebin4.png",
  "/bins/extralargebin5.png",
  "/bins/extralargebin6.png",
] as const;
const TRASH_PILES = ["/bins/trashpile1.png"] as const;

const BIN_ICON_SIZE_MUL = 1.7;
const LIGHT_BIN_SIZE_MUL = 2.5;
const TRASH_PILE_SIZE_MUL = 1.22;

const BIN_ANCHOR: Record<PlacedHouse["kind"], { x: number; y: number }> = {
  // local offsets in a 512x512 house sprite box
  base: { x: 280, y: 420 },
  mid: { x: 280, y: 420 },
  full: { x: 280, y: 420 },
};

const TRASH_PILE_ANCHOR: Record<PlacedHouse["kind"], { x: number; y: number }> = {
  // local offsets in a 512x512 house sprite box
  base: { x: 180, y: 400 },
  mid: { x: 165, y: 400 },
  full: { x: 180, y: 400 },
};

function scaleSprite(s: TrashSprite, sizeMul: number): TrashSprite {
  return { ...s, w: Math.round(s.w * sizeMul), h: Math.round(s.h * sizeMul) };
}

function houseBinsFor(h: PlacedHouse): TrashSprite[] {
  const family = familyForHouse(h.boardId, h.padIndex);
  const trashLbs = Math.max(1, Math.min(30, family.dailyAvgTrash));
  const anchor = BIN_ANCHOR[h.kind];
  const rng = makeRng(`${h.id}:bin`);
  if (trashLbs <= 7) {
    const src = LIGHT_BINS[Math.floor(rng() * LIGHT_BINS.length)]!;
    return [scaleSprite({ src, x: anchor.x - 10, y: anchor.y - 6, w: 72, h: 62 }, LIGHT_BIN_SIZE_MUL)];
  }
  if (trashLbs <= 14) {
    const src = MEDIUM_BINS[Math.floor(rng() * MEDIUM_BINS.length)]!;
    // Same size as light bins, but medium sprites sit differently (less left/up bias).
    return [scaleSprite({ src, x: anchor.x - 8, y: anchor.y - 4, w: 84, h: 70 }, LIGHT_BIN_SIZE_MUL)];
  }
  if (trashLbs <= 22) {
    const src = LARGE_BINS[Math.floor(rng() * LARGE_BINS.length)]!;
    return [scaleSprite({ src, x: anchor.x, y: anchor.y, w: 106, h: 86 }, BIN_ICON_SIZE_MUL)];
  }

  const src = EXTRA_LARGE_BINS[Math.floor(rng() * EXTRA_LARGE_BINS.length)]!;
  return [scaleSprite({ src, x: anchor.x, y: anchor.y, w: 118, h: 94 }, BIN_ICON_SIZE_MUL)];
}

function houseTrashPileFor(h: PlacedHouse, cleared: boolean, session?: HouseSessionState): TrashSprite | null {
  if (cleared) return null;
  if (!session || !session.occupied || !session.trashPileActive) return null;
  const anchor = TRASH_PILE_ANCHOR[h.kind];
  const src = TRASH_PILES[hash(`${h.id}:pile`) % TRASH_PILES.length]!;
  return scaleSprite({ src, x: anchor.x + -100, y: anchor.y + -90, w: 95, h: 80 }, TRASH_PILE_SIZE_MUL);
}

function tempHappinessScore(avgTrashLbs: number, complaintsPerWeek: number): number {
  // temporary stand-in until backend provides explicit happiness
  const score = 100 - avgTrashLbs * 2.1 - complaintsPerWeek * 12;
  return Math.max(0, Math.min(100, score));
}

function trashPileClicksRequired(houseId: string): number {
  return 3 + (hash(`${houseId}:cleanup`) % 3); // 3..5
}

function randomInRangeMs(minSeconds: number, maxSeconds: number): number {
  const span = Math.max(0, maxSeconds - minSeconds + 1);
  const seconds = minSeconds + Math.floor(Math.random() * span);
  return seconds * 1000;
}

function generateApplicant(houseId: string): TenantApplicant {
  const first = ["Alex", "Sam", "Jamie", "Jordan", "Avery", "Taylor", "Morgan", "Casey", "Riley", "Quinn"];
  const last = ["Nguyen", "Patel", "Garcia", "Kim", "Johnson", "Brown", "Chen", "Lopez", "Davis", "Singh"];
  const id = `${houseId}:app:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const seed = hash(id);
  const malicious = (seed % 100) < 13; // ~13%
  const lowContribution = malicious || (seed % 10) < 2;
  const dailyContribution = lowContribution ? 40 + (seed % 26) : 90 + (seed % 180);
  const notes = malicious
    ? ["Former convicted felon for theft.", "Neighbors report suspicious late-night activity.", "History of missed payments and disputes."]
    : ["Cooks amazing meals for the block.", "Local artist who draws neighborhood murals.", "Quiet tenant who volunteers on weekends."];
  return {
    id,
    name: `${first[seed % first.length]} ${last[(seed >> 3) % last.length]}`,
    dailyContribution,
    note: notes[(seed >> 5) % notes.length]!,
    malicious,
  };
}

type IncidentScenarioAction = "warning" | "enforce" | "repair_small";
type IncidentScenario = { text: string; action: IncidentScenarioAction };

function houseIdToSlotIndex(houseId: string): number {
  const m = /-(\d+)$/.exec(houseId);
  const raw = m ? Number(m[1]) : 0;
  return Math.max(0, Math.min(8, raw));
}

function randomIncidentScenario(): IncidentScenario {
  const events: Array<IncidentScenario> = [
    { text: "Late-night noise complaints increased this week.", action: "warning" },
    { text: "Neighbors noticed packages going missing from porches.", action: "enforce" },
    { text: "Suspicious loitering reported near shared walkways.", action: "enforce" },
    { text: "Street-facing bins were knocked over overnight.", action: "repair_small" },
    { text: "A window was broken during the night.", action: "repair_small" },
    { text: "Multiple residents reported petty theft concerns.", action: "enforce" },
  ];
  return events[Math.floor(Math.random() * events.length)]!;
}

function incidentToMaintenanceTask(houseId: string, now: number, incident: IncidentScenario): MaintenanceTask | null {
  const slotIdx = houseIdToSlotIndex(houseId);
  const id = `${houseId}:task:incident:${incident.action}:${now}`;
  if (incident.action === "warning") {
    return {
      id,
      kind: "warning",
      label: incident.text,
      cost: WARNING_COST,
      happinessDelta: WARNING_HAPPINESS_DELTA,
    };
  }
  if (incident.action === "enforce") {
    return {
      id,
      kind: "enforce",
      label: incident.text,
      cost: ENFORCE_COST,
      happinessDelta: ENFORCE_HAPPINESS_DELTA,
    };
  }
  return {
    id,
    kind: "repair_small",
    label: `Repairs needed: ${incident.text}`,
    cost: REPAIR_SMALL_COST,
    happinessDelta: REPAIR_SMALL_HAPPINESS_DELTA,
    escalatesAt: now + randomInRangeMs(30, 60),
  };
}

function houseSrcForKind(variantId: HouseVariantId, kind: PlacedHouse["kind"]): string {
  const suffix = variantId.charAt(0).toUpperCase() + variantId.slice(1);
  if (kind === "mid") return `/houses/Mid_House_${suffix}.png`;
  if (kind === "full") return `/houses/Full_House_${suffix}.png`;
  return `/houses/Base_House_${suffix}.png`;
}

function initPlayerSlotKinds(variantId: HouseVariantId): Array<PlacedHouse["kind"] | null> {
  const slots: Array<PlacedHouse["kind"] | null> = new Array(9).fill(null);
  const indexes = Array.from({ length: 9 }, (_, i) => i);
  const rng = makeRng(`player-start-slots:${variantId}`);
  for (let i = indexes.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = indexes[i]!;
    indexes[i] = indexes[j]!;
    indexes[j] = tmp;
  }
  for (let i = 0; i < 4; i++) {
    slots[indexes[i]!] = "base";
  }
  return slots;
}

function brightenHex(hex: string, amount: number): string {
  // amount: 0..1, where 1 = white
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "rgba(255,255,255,0.95)";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const rr = Math.round(r + (255 - r) * amount);
  const gg = Math.round(g + (255 - g) * amount);
  const bb = Math.round(b + (255 - b) * amount);
  return `rgba(${rr},${gg},${bb},0.98)`;
}

function familyForHouse(boardId: string, padIndex: number): HouseFamilyInfo {
  const lastNames = [
    "Nguyen",
    "Garcia",
    "Patel",
    "Kim",
    "Smith",
    "Johnson",
    "Martinez",
    "Chen",
    "Brown",
    "Davis",
    "Lopez",
    "Singh",
  ];
  const seed = hash(`${boardId}:${padIndex}`);
  const lastName = lastNames[seed % lastNames.length]!;
  const dailyMoneyContribution = 50 + (seed % 200);
  const dailyAvgTrash = 1 + (seed % 30); // 1..30 lbs
  const complaintsPerWeek = seed % 6; // 0..5
  const notes =
    complaintsPerWeek >= 4
      ? "Repeated violations: trash bins visible from street. Neighbor reports loud leaf blower usage."
      : dailyAvgTrash > 18
        ? "Occasional overflow on pickup day. Recommend a warning letter."
        : "Mostly compliant. Lawn edges could be sharper.";

  return { lastName, dailyMoneyContribution, dailyAvgTrash, complaintsPerWeek, notes };
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function makeRng(seed: string) {
  // Deterministic PRNG in [0,1)
  let x = hash(seed) >>> 0;
  return () => {
    // xorshift32
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    // convert to [0,1)
    return (x >>> 0) / 4294967296;
  };
}

function weightedPick<T extends { w: number }>(items: readonly T[], rng: () => number): T {
  const total = items.reduce((s, it) => s + it.w, 0);
  let r = rng() * total;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it;
  }
  return items[items.length - 1]!;
}

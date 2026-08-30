import { Decision, PlanningItem, Tache } from "./api";

const DAY_START_MIN = 8 * 60; // 08:00 -> 480
const DAY_END_MIN = 20 * 60; // 20:00 -> 1200
const PAUSE_MIN = 10;

export function timeToMinutes(t: string): number {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export interface AvailableSlot {
  debut: string;
  fin: string;
  label: string;
  dureeMaxMin: number;
}

/**
 * Calcule tous les créneaux horaires disponibles à une date donnée,
 * compte tenu des tâches déjà planifiées (avec marge de pause de 10 min).
 */
export function getAvailableSlots(
  date: string,
  dureeMin: number,
  occupied: (PlanningItem | { date: string; debut: string; fin: string })[]
): AvailableSlot[] {
  if (!date || dureeMin <= 0) return [];

  // Filtrer pour la date demandée et trier par heure de début
  const dayOccupied = occupied
    .filter((item) => item.date === date && item.debut && item.fin)
    .map((item) => ({
      start: timeToMinutes(item.debut),
      end: timeToMinutes(item.fin),
    }))
    .sort((a, b) => a.start - b.start);

  // Fusionner les intervalles qui se chevauchent ou se touchent
  const merged: { start: number; end: number }[] = [];
  for (const interval of dayOccupied) {
    if (merged.length === 0) {
      merged.push({ ...interval });
    } else {
      const last = merged[merged.length - 1];
      if (interval.start <= last.end + PAUSE_MIN) {
        last.end = Math.max(last.end, interval.end);
      } else {
        merged.push({ ...interval });
      }
    }
  }

  // Trouver les espaces libres entre 08:00 et 20:00
  const freeWindows: { start: number; end: number }[] = [];
  let currentCursor = DAY_START_MIN;

  for (const occ of merged) {
    if (occ.start > currentCursor) {
      const windowEnd = occ.start - PAUSE_MIN;
      if (windowEnd - currentCursor >= dureeMin) {
        freeWindows.push({ start: currentCursor, end: windowEnd });
      }
    }
    currentCursor = Math.max(currentCursor, occ.end + PAUSE_MIN);
  }

  if (DAY_END_MIN - currentCursor >= dureeMin) {
    freeWindows.push({ start: currentCursor, end: DAY_END_MIN });
  }

  // Générer des créneaux concrets suggérés pour chaque fenêtre libre
  const slots: AvailableSlot[] = [];
  for (const win of freeWindows) {
    const totalWinDuration = win.end - win.start;
    // Suggérer le début de la fenêtre
    const s1 = win.start;
    const e1 = s1 + dureeMin;
    slots.push({
      debut: minutesToTime(s1),
      fin: minutesToTime(e1),
      label: `${minutesToTime(s1)} – ${minutesToTime(e1)}`,
      dureeMaxMin: totalWinDuration,
    });

    // Si la fenêtre est assez large (> dureeMin + 30m), proposer d'autres départs (ex: +30m, +60m)
    let nextStart = win.start + 30;
    while (nextStart + dureeMin <= win.end && slots.length < 12) {
      slots.push({
        debut: minutesToTime(nextStart),
        fin: minutesToTime(nextStart + dureeMin),
        label: `${minutesToTime(nextStart)} – ${minutesToTime(nextStart + dureeMin)}`,
        dureeMaxMin: win.end - nextStart,
      });
      nextStart += 30;
    }
  }

  return slots;
}

/**
 * Trouve toutes les décisions et explications relatives à une tâche donnée.
 */
export function getTaskDecisions(taskId: string, decisions: Decision[]): Decision[] {
  if (!taskId || !decisions) return [];
  return decisions.filter(
    (d) =>
      d.tache_id === taskId ||
      d.tache_id.split(",").map((s) => s.trim()).includes(taskId)
  );
}

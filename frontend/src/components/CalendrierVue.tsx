"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Tag, X } from "lucide-react";
import { PlanningItem, Decision, Tache } from "@/lib/api";
import { getAvailableSlots, AvailableSlot } from "@/lib/planningUtils";
import { ViewMode } from "./SelecteurVue";

interface CalendrierVueProps {
  planning: PlanningItem[];
  decisions: Decision[];
  view: ViewMode;
  selectedDate: string;
  fullTasks?: Tache[];
  onTaskEdit?: (task: Tache) => void;
}

const PRIORITE_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  urgent:    { bg: "bg-rose-500/20",   border: "border-rose-500/50",   text: "text-rose-300",   badge: "bg-rose-500/20 text-rose-400" },
  important: { bg: "bg-amber-500/20",  border: "border-amber-500/50",  text: "text-amber-300",  badge: "bg-amber-500/20 text-amber-400" },
  flexible:  { bg: "bg-slate-500/20",  border: "border-slate-400/50",  text: "text-slate-300",  badge: "bg-slate-500/20 text-slate-400" },
};

// 08:00 to 20:00 → 12 hours → 720 minutes
const DAY_START_MIN = 8 * 60;   // 480
const DAY_TOTAL_MIN = 12 * 60;  // 720
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08 to 20 (labels)

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function topPct(debut: string): number {
  return ((timeToMinutes(debut) - DAY_START_MIN) / DAY_TOTAL_MIN) * 100;
}
function heightPct(debut: string, fin: string): number {
  return Math.max(((timeToMinutes(fin) - timeToMinutes(debut)) / DAY_TOTAL_MIN) * 100, 1.5);
}

function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStart(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

function getWeekDays(dateStr: string): string[] {
  const start = getWeekStart(dateStr);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toLocalDateString(d);
  });
}

function getMonthCells(dateStr: string): { date: string; inMonth: boolean }[] {
  const ref = new Date(dateStr + "T00:00:00");
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const cells: { date: string; inMonth: boolean }[] = [];

  for (let i = startPad; i > 0; i--) {
    const d = new Date(firstDay);
    d.setDate(firstDay.getDate() - i);
    cells.push({ date: toLocalDateString(d), inMonth: false });
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    cells.push({
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`,
      inMonth: true,
    });
  }
  const needed = Math.ceil(cells.length / 7) * 7;
  for (let i = 1; cells.length < needed; i++) {
    const d = new Date(lastDay);
    d.setDate(lastDay.getDate() + i);
    cells.push({ date: toLocalDateString(d), inMonth: false });
  }
  return cells;
}

// ─── Task detail modal ─────────────────────────────────────────────────────────
function TaskModal({ task, decisions = [], originalTask, onClose, onSave, allPlanning = [] }: {
  task: PlanningItem;
  decisions?: Decision[];
  originalTask?: Tache;
  onClose: () => void;
  onSave?: (task: Tache) => void;
  allPlanning?: PlanningItem[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState(originalTask?.date || task.date);
  const [editHoraire, setEditHoraire] = useState(originalTask?.horaire_fixe || task.debut || "");
  const [editDuree, setEditDuree] = useState(originalTask?.duree_min?.toString() || "30");

  const taskDecisions = decisions.filter(
    (d) => d.tache_id === task.id || d.tache_id.split(",").map(s => s.trim()).includes(task.id)
  );

  // Exclude current task from occupied calculation
  const occupiedWithoutCurrent = allPlanning.filter((p) => p.id !== task.id);
  const dureeNum = parseInt(editDuree, 10) || 30;
  const availableSlots = getAvailableSlots(editDate, dureeNum, occupiedWithoutCurrent);

  if (isEditing && originalTask) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 shadow-2xl space-y-4 my-8"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Ajustement d'horaire</span>
              <h3 className="font-bold text-base text-foreground leading-tight">{task.nom}</h3>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-foreground/40 hover:text-foreground/80 transition-colors p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-3.5 text-xs text-foreground/80">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-foreground/60 mb-1">Date</label>
                <input 
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-foreground/60 mb-1">Durée (min)</label>
                <input 
                  type="number"
                  min="5"
                  step="5"
                  value={editDuree}
                  onChange={(e) => setEditDuree(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border/40 bg-muted/10 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-foreground/80">Horaire imposé (HH:MM)</label>
                {editHoraire && (
                  <button type="button" onClick={() => setEditHoraire("")} className="text-[10px] text-rose-400 hover:underline">
                    Rendre flexible
                  </button>
                )}
              </div>
              <input 
                type="time"
                value={editHoraire}
                onChange={(e) => setEditHoraire(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-background px-3 py-1.5 text-xs"
              />

              <div className="pt-1.5 border-t border-border/30">
                <span className="text-[10px] font-medium text-foreground/50 block mb-1">
                  Créneaux libres détectés le {editDate} :
                </span>
                {availableSlots.length > 0 ? (
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {availableSlots.map((slot, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setEditHoraire(slot.debut)}
                        className={`rounded-lg border px-2 py-0.5 text-[10px] font-medium transition-all ${
                          editHoraire === slot.debut
                            ? "border-primary bg-primary text-primary-foreground font-bold"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        }`}
                      >
                        ✨ {slot.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-amber-400/90 italic">
                    Aucun créneau continu disponible.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 rounded-xl border border-border/50 bg-muted/20 py-2 text-xs font-semibold text-foreground/70"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (onSave) {
                  onSave({
                    ...originalTask,
                    date: editDate,
                    horaire_fixe: editHoraire || null,
                    duree_min: parseInt(editDuree, 10) || originalTask.duree_min
                  });
                }
              }}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
            >
              Appliquer & Replanifier
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 shadow-2xl space-y-4 my-8"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Tâche planifiée</span>
            <h3 className="font-bold text-base text-foreground leading-tight">{task.nom}</h3>
            <p className="text-[10px] text-foreground/40 font-mono">ID: {task.id}</p>
          </div>
          <div className="flex items-center gap-2">
            {originalTask && (
              <button 
                onClick={() => setIsEditing(true)} 
                className="text-primary hover:bg-primary/20 transition-colors text-xs font-semibold bg-primary/10 px-2.5 py-1 rounded-xl"
              >
                Ajuster
              </button>
            )}
            <button onClick={onClose} className="text-foreground/40 hover:text-foreground/80 transition-colors p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3 text-xs text-foreground/70">
          <div className="grid grid-cols-2 gap-2 bg-muted/15 p-3 rounded-2xl border border-border/30">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
              <span>{task.date} · <strong>{task.debut} – {task.fin}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize border ${PRIORITE_STYLES[task.priorite].badge} ${PRIORITE_STYLES[task.priorite].border}`}>
                {task.priorite}
              </span>
            </div>
          </div>

          {/* Decision Reasoning */}
          <div className="space-y-1.5">
            <p className="font-semibold text-foreground/60 uppercase tracking-wider text-[10px]">
              Raisonnement & Décision de placement :
            </p>
            {taskDecisions.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {taskDecisions.map((d, i) => (
                  <div key={i} className="rounded-xl bg-muted/20 border border-border/40 p-2.5 space-y-0.5">
                    <span className="font-semibold text-foreground/80 text-[11px] block">
                      Étape : {d.etape.replace("_", " ")} {d.creneau ? `(${d.creneau})` : ""}
                    </span>
                    <p className="leading-relaxed text-[11px] text-foreground/60">{d.raison}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-[11px] text-emerald-300">
                ✓ Créneau alloué par le solveur selon les contraintes de disponibilité et précédence.
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Single day column with tasks ─────────────────────────────────────────────
function DayColumn({ date, tasks, decisions, fullTasks, onTaskEdit, compact = false }: {
  date: string;
  tasks: PlanningItem[];
  decisions: Decision[];
  fullTasks?: Tache[];
  onTaskEdit?: (task: Tache) => void;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<PlanningItem | null>(null);

  const getDecision = (id: string) =>
    decisions.find((d) => d.tache_id === id && d.etape === "arbitrage_regles");

  return (
    // CRITICAL: use absolute inset-0 so this fills the positioned parent completely
    <div className="absolute inset-0">
      {/* Hour grid lines */}
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute w-full border-t border-border/20"
          style={{ top: `${((h * 60 - DAY_START_MIN) / DAY_TOTAL_MIN) * 100}%` }}
        />
      ))}

      {/* Task blocks */}
      {tasks.map((t) => {
        const s = PRIORITE_STYLES[t.priorite];
        const top = topPct(t.debut);
        const height = heightPct(t.debut, t.fin);
        return (
          <motion.button
            key={t.id}
            id={`task-block-${t.id}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02, zIndex: 30 }}
            onClick={() => setSelected(t)}
            className={`absolute left-0.5 right-0.5 rounded-lg border px-1.5 py-1 text-left overflow-hidden cursor-pointer transition-shadow hover:shadow-lg backdrop-blur-md ${s.bg} ${s.border}`}
            style={{
              top: `${top}%`,
              height: `${height}%`,
              minHeight: compact ? "20px" : "32px",
              zIndex: 10,
              boxShadow: "0 2px 10px -2px rgba(0,0,0,0.1)"
            }}
          >
            <p className={`font-semibold truncate leading-tight ${compact ? "text-[9px]" : "text-[11px]"} ${s.text}`}>
              {t.nom}
            </p>
            {!compact && (
              <p className="text-[9px] text-foreground/50 mt-0.5 font-mono">
                {t.debut}–{t.fin}
              </p>
            )}
          </motion.button>
        );
      })}

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <TaskModal
            task={selected}
            decisions={decisions}
            allPlanning={tasks}
            originalTask={fullTasks?.find((t) => t.id === selected.id)}
            onClose={() => setSelected(null)}
            onSave={(updatedTask) => {
              onTaskEdit?.(updatedTask);
              setSelected(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Time axis (shared) ────────────────────────────────────────────────────────
function TimeAxis() {
  return (
    <div className="relative w-10 shrink-0 select-none h-full">
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute right-2 text-[10px] text-foreground/30 -translate-y-1/2"
          style={{ top: `${((h * 60 - DAY_START_MIN) / DAY_TOTAL_MIN) * 100}%` }}
        >
          {String(h).padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function CalendrierVue({ planning, decisions, view, selectedDate, fullTasks, onTaskEdit }: CalendrierVueProps) {
  const tasksByDate = planning.reduce<Record<string, PlanningItem[]>>((acc, t) => {
    (acc[t.date] ??= []).push(t);
    return acc;
  }, {});

  const GRID_HEIGHT = 600; // px — consistent across views

  // ── Jour ────────────────────────────────────────────────────────────────────
  if (view === "jour") {
    const tasks = tasksByDate[selectedDate] ?? [];
    return (
      <div className="flex gap-2" style={{ height: GRID_HEIGHT }}>
        {/* Time axis */}
        <div className="relative shrink-0 w-10" style={{ height: GRID_HEIGHT }}>
          <TimeAxis />
        </div>
        {/* Day column */}
        <div className="flex-1 relative border-l border-border/30">
          {tasks.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-foreground/30">
              Aucune tâche planifiée pour ce jour.
            </div>
          ) : (
            <DayColumn date={selectedDate} tasks={tasks} decisions={decisions} fullTasks={fullTasks} onTaskEdit={onTaskEdit} />
          )}
        </div>
      </div>
    );
  }

  // ── Semaine ──────────────────────────────────────────────────────────────────
  if (view === "semaine") {
    const weekDays = getWeekDays(selectedDate);
    const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const todayStr = toLocalDateString(new Date());

    return (
      <div className="flex flex-col">
        {/* Headers */}
        <div className="flex border-b border-border/30 mb-0" style={{ paddingLeft: "2.5rem" }}>
          {weekDays.map((d, i) => {
            const dt = new Date(d + "T00:00:00");
            const isToday = d === todayStr;
            return (
              <div key={d} className="flex-1 text-center py-2">
                <p className="text-[10px] uppercase tracking-wider text-foreground/40">{DAY_NAMES[i]}</p>
                <p className={`text-sm font-bold mt-0.5 w-7 h-7 rounded-full flex items-center justify-center mx-auto ${
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground/70"
                }`}>
                  {dt.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Grid */}
        <div className="flex" style={{ height: GRID_HEIGHT }}>
          {/* Time axis */}
          <div className="relative shrink-0 w-10" style={{ height: GRID_HEIGHT }}>
            <TimeAxis />
          </div>
          {/* 7 day columns */}
          {weekDays.map((d) => (
            <div key={d} className="flex-1 relative border-l border-border/20">
              <DayColumn date={d} tasks={tasksByDate[d] ?? []} decisions={decisions} fullTasks={fullTasks} onTaskEdit={onTaskEdit} compact />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Mois ─────────────────────────────────────────────────────────────────────
  const cells = getMonthCells(selectedDate);
  const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const todayStr = toLocalDateString(new Date());

  return (
    <div>
      {/* Header row */}
      <div className="grid grid-cols-7 border-b border-border/30 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] uppercase tracking-wider text-foreground/40 py-2">
            {d}
          </div>
        ))}
      </div>
      {/* Calendar grid */}
      <div className="grid grid-cols-7 border border-border/30 rounded-xl overflow-hidden">
        {cells.map(({ date, inMonth }) => {
          const tasks = tasksByDate[date] ?? [];
          const isToday = date === todayStr;
          const isSelected = date === selectedDate;
          const dayNum = new Date(date + "T00:00:00").getDate();
          return (
            <div
              key={date}
              id={`month-cell-${date}`}
              className={`min-h-[88px] p-1.5 border-r border-b border-border/20 last:border-r-0 ${
                !inMonth ? "bg-muted/10 opacity-40" : "bg-background/50 hover:bg-muted/20"
              }`}
            >
              <div className="flex justify-end mb-1">
                <span className={`text-[11px] font-semibold w-5 h-5 rounded-full flex items-center justify-center ${
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : isSelected
                    ? "text-primary ring-1 ring-primary"
                    : "text-foreground/50"
                }`}>
                  {dayNum}
                </span>
              </div>
              <div className="space-y-0.5">
                {tasks.slice(0, 3).map((t) => {
                  const s = PRIORITE_STYLES[t.priorite];
                  return (
                    <div
                      key={t.id}
                      className={`rounded px-1 py-0.5 text-[9px] truncate leading-tight ${s.bg} ${s.text} border ${s.border}`}
                    >
                      {t.debut} {t.nom}
                    </div>
                  );
                })}
                {tasks.length > 3 && (
                  <p className="text-[9px] text-foreground/40 pl-1">+{tasks.length - 3}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  Sparkles,
  Tag,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Tache, PlanningItem, Decision } from "@/lib/api";
import { getAvailableSlots } from "@/lib/planningUtils";

interface ModalPlacementManuelProps {
  task: Tache | null;
  decision?: Decision | null;
  failureReason?: string | null;
  existingPlanning?: PlanningItem[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: Tache) => void;
}

export default function ModalPlacementManuel({
  task,
  decision,
  failureReason,
  existingPlanning = [],
  isOpen,
  onClose,
  onSave,
}: ModalPlacementManuelProps) {
  const [date, setDate] = useState(task?.date || "");
  const [horaireFixe, setHoraireFixe] = useState(task?.horaire_fixe || "");
  const [dureeMin, setDureeMin] = useState(task?.duree_min || 30);
  const [priorite, setPriorite] = useState<"urgent" | "important" | "flexible">(
    task?.priorite || "important"
  );

  // Sync state whenever task changes
  useEffect(() => {
    if (task) {
      setDate(task.date);
      setHoraireFixe(task.horaire_fixe || "");
      setDureeMin(task.duree_min);
      setPriorite(task.priorite);
    }
  }, [task]);

  // Exclude current task from occupied slots calculation so it can reuse its own previous space if wanted
  const occupiedWithoutCurrent = useMemo(() => {
    if (!task) return existingPlanning;
    return existingPlanning.filter((p) => p.id !== task.id);
  }, [existingPlanning, task]);

  // Calculate free slots dynamically
  const availableSlots = useMemo(() => {
    if (!date || dureeMin <= 0) return [];
    return getAvailableSlots(date, dureeMin, occupiedWithoutCurrent);
  }, [date, dureeMin, occupiedWithoutCurrent]);

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...task,
      date,
      horaire_fixe: horaireFixe.trim() || null,
      duree_min: Number(dureeMin),
      priorite,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.93, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.93, y: 16 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 shadow-2xl space-y-4 my-8"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Ajustement Manuel
              </span>
              <h3 className="font-bold text-base text-foreground leading-tight">
                {task.nom}
              </h3>
              <p className="text-[11px] text-foreground/45">ID: {task.id}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-foreground/40 hover:bg-muted/40 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Reason / Diagnostic banner */}
          {(failureReason || decision) && (
            <div className="rounded-2xl bg-neutral-500/10 border border-neutral-500/25 p-3 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-400 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Raisonnement du système</span>
              </div>
              <p className="text-foreground/70 leading-relaxed text-[11px]">
                {failureReason || decision?.raison || "Tâche en conflit d'horaire ou de priorité."}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Date & Durée */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-foreground/70 mb-1 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground/70 mb-1 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-neutral-400" /> Durée (min)
                </label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={dureeMin}
                  onChange={(e) => setDureeMin(Math.max(5, parseInt(e.target.value, 10) || 5))}
                  required
                  className="w-full rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Priorité */}
            <div>
              <label className="block font-medium text-foreground/70 mb-1 flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-neutral-400" /> Priorité
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "urgent", label: "Urgent", color: "border-red-500/40 text-red-500 bg-red-500/10" },
                  { key: "important", label: "Important", color: "border-amber-400/40 text-amber-500 bg-amber-400/10" },
                  { key: "flexible", label: "Flexible", color: "border-neutral-500/40 text-neutral-400 bg-neutral-500/10" },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPriorite(p.key as any)}
                    className={`rounded-xl border py-1.5 text-xs font-semibold transition-all ${
                      priorite === p.key
                        ? `${p.color} ring-1 ring-primary/40`
                        : "border-border/40 bg-muted/20 text-foreground/50 hover:bg-muted/40"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Créneaux suggérés & Choix horaire */}
            <div className="rounded-2xl border border-border/40 bg-muted/10 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground/80 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Créneau horaire assigné
                </label>
                {horaireFixe && (
                  <button
                    type="button"
                    onClick={() => setHoraireFixe("")}
                    className="text-[10px] text-neutral-400 hover:underline"
                  >
                    Rendre flexible
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={horaireFixe}
                  onChange={(e) => setHoraireFixe(e.target.value)}
                  className="rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
                <span className="text-[11px] text-foreground/50">
                  {horaireFixe ? `Heure de début : ${horaireFixe}` : "Automatique par le solveur"}
                </span>
              </div>

              {/* Créneaux disponibles en direct */}
              <div className="pt-2 border-t border-border/30">
                <span className="text-[10px] font-semibold text-foreground/60 block mb-1.5">
                  Créneaux libres recommandés le {date} ({dureeMin}min) :
                </span>
                {availableSlots.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {availableSlots.map((slot, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setHoraireFixe(slot.debut)}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all ${
                          horaireFixe === slot.debut
                            ? "border-primary bg-primary text-primary-foreground font-bold shadow-sm"
                            : "border-neutral-500/30 bg-neutral-500/10 text-neutral-400 hover:bg-neutral-500/20"
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-400/90 italic">
                    Aucun créneau continu de {dureeMin}min disponible sur cette journée. Modifiez la date ou réduisez la durée.
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-border/50 bg-muted/20 py-2.5 text-xs font-semibold text-foreground/70 hover:bg-muted/40 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                <CheckCircle2 className="h-4 w-4" />
                Appliquer & Replanifier
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

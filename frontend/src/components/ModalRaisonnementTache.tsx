"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Brain,
  Cpu,
  Clock,
  Calendar,
  Tag,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  Sparkles,
} from "lucide-react";
import { Tache, PlanningItem, Decision } from "@/lib/api";

interface ModalRaisonnementTacheProps {
  task: Tache | PlanningItem | null;
  decisionList?: Decision[];
  planningItem?: PlanningItem | null;
  failureReason?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenManualPlacement?: (task: Tache) => void;
  originalTask?: Tache | null;
}

export default function ModalRaisonnementTache({
  task,
  decisionList = [],
  planningItem,
  failureReason,
  isOpen,
  onClose,
  onOpenManualPlacement,
  originalTask,
}: ModalRaisonnementTacheProps) {
  if (!isOpen || !task) return null;

  const isPlanned = !!planningItem || (task as PlanningItem).debut !== undefined;
  const slotStr = planningItem
    ? `${planningItem.debut} – ${planningItem.fin}`
    : (task as PlanningItem).debut
    ? `${(task as PlanningItem).debut} – ${(task as PlanningItem).fin}`
    : null;

  const relatedDecisions = decisionList.filter(
    (d) =>
      d.tache_id === task.id ||
      d.tache_id.split(",").map((s) => s.trim()).includes(task.id)
  );

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
          className="w-full max-w-lg rounded-3xl border border-border/60 bg-background p-6 shadow-2xl space-y-5 my-8"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  isPlanned
                    ? "bg-neutral-500/15 text-neutral-400 border border-neutral-500/20"
                    : "bg-neutral-500/15 text-neutral-400 border border-neutral-500/20"
                }`}
              >
                {isPlanned ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
              </div>
              <div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isPlanned
                      ? "bg-neutral-500/15 text-neutral-400 border border-neutral-500/30"
                      : "bg-neutral-500/15 text-neutral-400 border border-neutral-500/30"
                  }`}
                >
                  {isPlanned ? "Planifiée avec succès" : "Non planifiée / Refusée"}
                </span>
                <h3 className="font-bold text-base text-foreground leading-tight mt-1">
                  {task.nom}
                </h3>
                <p className="text-[11px] text-foreground/45">ID: {task.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-foreground/40 hover:bg-muted/40 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick info badges */}
          <div className="grid grid-cols-3 gap-2 text-xs bg-muted/15 p-3 rounded-2xl border border-border/30">
            <div>
              <span className="text-[10px] text-foreground/40 block">Date</span>
              <span className="font-semibold text-foreground">{task.date}</span>
            </div>
            <div>
              <span className="text-[10px] text-foreground/40 block">Priorité</span>
              <span
                className={`font-semibold capitalize ${
                  task.priorite === "urgent"
                    ? "text-neutral-400"
                    : task.priorite === "important"
                    ? "text-neutral-400"
                    : "text-neutral-400"
                }`}
              >
                {task.priorite}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-foreground/40 block">Créneau assigné</span>
              <span className="font-semibold text-foreground">
                {slotStr ? slotStr : "Aucun"}
              </span>
            </div>
          </div>

          {/* Decision Reasoning Section */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/60 flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5 text-neutral-400" />
              Raisonnement & Décisions du solveur
            </h4>

            {relatedDecisions.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {relatedDecisions.map((d, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/40 bg-muted/20 p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        {d.resultat === "place" ? (
                          <CheckCircle2 className="h-3 w-3 text-neutral-400" />
                        ) : d.resultat === "decalee" ? (
                          <AlertTriangle className="h-3 w-3 text-neutral-400" />
                        ) : (
                          <XCircle className="h-3 w-3 text-neutral-400" />
                        )}
                        Étape : {d.etape.replace("_", " ")}
                      </span>
                      {d.creneau && (
                        <span className="font-mono text-[10px] bg-background/60 px-1.5 py-0.5 rounded text-foreground/60 border border-border/40">
                          {d.creneau}
                        </span>
                      )}
                    </div>
                    <p className="text-foreground/70 leading-relaxed text-[11px]">
                      {d.raison}
                    </p>
                  </div>
                ))}
              </div>
            ) : failureReason ? (
              <div className="rounded-xl border border-neutral-500/20 bg-neutral-500/10 p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-neutral-400 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Motif du refus ou de l'échec</span>
                </div>
                <p className="text-foreground/80 leading-relaxed text-[11px]">
                  {failureReason}
                </p>
              </div>
            ) : isPlanned ? (
              <div className="rounded-xl border border-neutral-500/20 bg-neutral-500/10 p-3 text-xs text-neutral-300">
                <p className="leading-relaxed">
                  ✓ Cette tâche a été allouée sans conflit sur le créneau{" "}
                  <strong>{slotStr}</strong> selon les contraintes de disponibilité et de pause.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-xs text-foreground/50 italic">
                Aucun log de décision spécifique enregistré pour cette tâche.
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="flex gap-2 pt-2 border-t border-border/30">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-border/50 bg-muted/20 py-2.5 text-xs font-semibold text-foreground/70 hover:bg-muted/40 transition-colors"
            >
              Fermer
            </button>
            {onOpenManualPlacement && (
              <button
                onClick={() => {
                  onClose();
                  const targetTask =
                    originalTask ||
                    ({
                      id: task.id,
                      nom: task.nom,
                      date: task.date,
                      duree_min: (task as any).duree_min || 30,
                      horaire_fixe: (task as any).horaire_fixe || null,
                      plage_disponibilite: null,
                      priorite: task.priorite,
                      dependances: (task as any).dependances || [],
                    } as Tache);
                  onOpenManualPlacement(targetTask);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                <Wrench className="h-3.5 w-3.5" />
                Ajuster manuellement
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Calendar,
  Clock,
  Sparkles,
  Tag,
  GitBranch,
  AlertCircle,
} from "lucide-react";
import { Tache, PlanningItem } from "@/lib/api";
import { getAvailableSlots } from "@/lib/planningUtils";

interface ModalAjoutTacheProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (nouvelleTache: Tache) => void;
  existingTasks: Tache[];
  existingPlanning?: PlanningItem[];
  defaultDate?: string;
}

const DUREES_RAPIDES = [15, 30, 45, 60, 90, 120, 180];

export default function ModalAjoutTache({
  isOpen,
  onClose,
  onAdd,
  existingTasks,
  existingPlanning = [],
  defaultDate,
}: ModalAjoutTacheProps) {
  const todayStr = useMemo(
    () => defaultDate || new Date().toISOString().slice(0, 10),
    [defaultDate]
  );

  const [nom, setNom] = useState("");
  const [date, setDate] = useState(todayStr);
  const [dureeMin, setDureeMin] = useState(60);
  const [priorite, setPriorite] = useState<"urgent" | "important" | "flexible">("important");
  const [horaireFixe, setHoraireFixe] = useState("");
  const [dependances, setDependances] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Calcul des créneaux libres en direct
  const availableSlots = useMemo(() => {
    return getAvailableSlots(date, dureeMin, existingPlanning);
  }, [date, dureeMin, existingPlanning]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) {
      setError("Le nom de la tâche est obligatoire.");
      return;
    }
    if (!date) {
      setError("La date est obligatoire.");
      return;
    }
    if (dureeMin <= 0) {
      setError("La durée doit être supérieure à 0.");
      return;
    }

    const newId = `t_${Date.now().toString().slice(-6)}`;
    const nouvelleTache: Tache = {
      id: newId,
      nom: nom.trim(),
      date,
      duree_min: Number(dureeMin),
      horaire_fixe: horaireFixe.trim() || null,
      plage_disponibilite: null,
      priorite,
      dependances,
    };

    onAdd(nouvelleTache);
    // Reset form
    setNom("");
    setHoraireFixe("");
    setDependances([]);
    setError(null);
    onClose();
  };

  const toggleDependance = (id: string) => {
    setDependances((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Ajouter une nouvelle tâche</h3>
                <p className="text-xs text-foreground/50">Configurez les contraintes et horaires</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-foreground/40 hover:bg-muted/40 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-neutral-500/10 border border-neutral-500/20 p-3 text-xs text-neutral-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Nom */}
            <div>
              <label className="block font-medium text-foreground/70 mb-1.5">
                Nom de la tâche <span className="text-neutral-400">*</span>
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: Réunion de cadrage projet"
                required
                className="w-full rounded-xl border border-border/50 bg-muted/20 px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            {/* Date & Durée */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-foreground/70 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Date <span className="text-neutral-400">*</span>
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
                <label className="block font-medium text-foreground/70 mb-1.5 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-neutral-400" /> Durée (minutes) <span className="text-neutral-400">*</span>
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
                {/* Durées rapides */}
                <div className="flex gap-1 flex-wrap mt-1.5">
                  {DUREES_RAPIDES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDureeMin(d)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        dureeMin === d
                          ? "bg-primary text-primary-foreground font-bold"
                          : "bg-muted/40 text-foreground/60 hover:bg-muted/70"
                      }`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Priorité */}
            <div>
              <label className="block font-medium text-foreground/70 mb-1.5 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-neutral-400" /> Niveau de priorité
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
                    className={`rounded-xl border p-2.5 font-semibold text-center transition-all ${
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

            {/* Créneaux suggérés & Horaire fixe */}
            <div className="rounded-2xl border border-border/40 bg-muted/10 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground/80 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Créneau horaire fixe (optionnel)
                </label>
                {horaireFixe && (
                  <button
                    type="button"
                    onClick={() => setHoraireFixe("")}
                    className="text-[10px] text-neutral-400 hover:underline"
                  >
                    Effacer (rendre flexible)
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
                <span className="text-[11px] text-foreground/45">
                  {horaireFixe ? `Heure de début imposée à ${horaireFixe}` : "Laissez vide pour placement automatique"}
                </span>
              </div>

              {/* Suggestions de créneaux disponibles */}
              <div className="pt-1.5 border-t border-border/30">
                <span className="text-[10px] font-medium text-foreground/50 block mb-1.5">
                  Créneaux libres détectés le {date} ({dureeMin}min) :
                </span>
                {availableSlots.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {availableSlots.map((slot, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setHoraireFixe(slot.debut)}
                        className={`rounded-lg border px-2 py-1 text-[10px] font-medium transition-all ${
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
                    Aucun créneau continu de {dureeMin}min libre sur cette journée.
                  </p>
                )}
              </div>
            </div>

            {/* Dépendances */}
            {existingTasks.length > 0 && (
              <div>
                <label className="block font-medium text-foreground/70 mb-1.5 flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5 text-neutral-400" /> Tâches préalables (dépendances)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto rounded-xl border border-border/40 bg-muted/15 p-2.5">
                  {existingTasks.map((t) => {
                    const isSelected = dependances.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleDependance(t.id)}
                        className={`rounded-lg border px-2 py-1 text-[11px] transition-all flex items-center gap-1 ${
                          isSelected
                            ? "border-neutral-500 bg-neutral-500/20 text-neutral-300 font-semibold"
                            : "border-border/40 bg-background/50 text-foreground/60 hover:bg-background"
                        }`}
                      >
                        {isSelected && <span className="text-[10px]">✓</span>}
                        {t.nom}
                        <span className="text-[9px] opacity-50">({t.date})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit */}
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
                <Plus className="h-4 w-4" />
                Ajouter la tâche
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

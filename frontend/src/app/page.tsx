"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck2,
  Brain,
  Cpu,
  Play,
  Loader2,
  LayoutGrid,
  ChevronRight,
  Save,
  X,
  Trash2,
  AlertTriangle,
  FlaskConical,
  Plus,
  Eye,
  Wrench,
  HelpCircle,
} from "lucide-react";

import ImportTaches from "@/components/ImportTaches";
import SelecteurVue, { ViewMode } from "@/components/SelecteurVue";
import CalendrierVue from "@/components/CalendrierVue";
import PanneauDecisions from "@/components/PanneauDecisions";
import DarkModeToggle from "@/components/DarkModeToggle";
import ModalAjoutTache from "@/components/ModalAjoutTache";
import ModalPlacementManuel from "@/components/ModalPlacementManuel";
import ModalRaisonnementTache from "@/components/ModalRaisonnementTache";
import { toast } from "sonner";

import { Tache, planifier as apiBPlanifier, PlanningResult, sauvegarderEtat, chargerEtat, PlanningItem } from "@/lib/api";

type SolverMode = "csp_seul" | "csp_regles";

const todayDate = new Date();
const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;

export default function Home() {
  const [taches, setTaches] = useState<Tache[]>([]);
  const [mode, setMode] = useState<SolverMode>("csp_regles");
  const [view, setView] = useState<ViewMode>("semaine");
  const [selectedDate, setSelectedDate] = useState(today);
  const [result, setResult] = useState<PlanningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"import" | "calendar">("import");
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<{ task: Tache; reason?: string } | null>(null);
  const [inspectingTask, setInspectingTask] = useState<{ task: Tache | PlanningItem; reason?: string } | null>(null);

  // Load saved state on startup
  useEffect(() => {
    const loadState = async () => {
      try {
        const data = await chargerEtat();
        if (data.taches.length > 0) {
          setTaches(data.taches);
        }
        if (data.resultat) {
          setResult(data.resultat);
          setActiveSection("calendar");
          if (data.resultat.planning.length > 0) {
            setSelectedDate(data.resultat.planning[0].date);
          }
        }
      } catch (err) {
        console.warn("Failed to load saved state:", err);
      }
    };

    loadState();
  }, []);

  // Reset the entire calendar (wipe planning, keep task list)
  const resetCalendar = async () => {
    setResult(null);
    try {
      await sauvegarderEtat(taches, { planning: [], decisions: [], avertissements: [], echecs: [], taches_non_planifiees: [] });
    } catch { /* ignore */ }
    toast.success("Calendrier réinitialisé");
  };

  // Save the current state (taches and planning result) to backend
  const saveState = async () => {
    if (result) {
      try {
        await sauvegarderEtat(taches, result);
        toast.success("État sauvegardé avec succès");
      } catch (err) {
        console.error("Failed to save state:", err);
        toast.error("Échec de la sauvegarde de l'état");
      }
    }
  };

  // Handle task edits from the calendar or unplanned list
  const handleTaskEdit = async (updatedTask: Tache) => {
    const newTaches = taches.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    // If not in list, add it
    if (!newTaches.some((t) => t.id === updatedTask.id)) {
      newTaches.push(updatedTask);
    }
    setTaches(newTaches);
    
    const nDates = newTaches.map((t) => t.date).sort();
    const nDateDebut = nDates[0] ?? today;
    const nDateFin = nDates[nDates.length - 1] ?? today;

    setLoading(true);
    try {
      const existingWithoutEdited = (result?.planning ?? []).filter((p) => p.id !== updatedTask.id);
      const res = await apiBPlanifier(newTaches, mode, nDateDebut, nDateFin, existingWithoutEdited);
      setResult(res);
      if (res.planning.length > 0) {
        setSelectedDate(res.planning[0].date);
      }
      await sauvegarderEtat(newTaches, res);
      toast.success("Replanification réussie");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la replanification");
    } finally {
      setLoading(false);
    }
  };

  // Add a new task manually
  const handleAddTask = (newTask: Tache) => {
    setTaches((prev) => {
      const exists = prev.some((t) => t.id === newTask.id);
      if (exists) return prev.map((t) => (t.id === newTask.id ? newTask : t));
      return [...prev, newTask];
    });
    toast.success(`Tâche « ${newTask.nom} » ajoutée avec succès !`);
  };

  const handlePlanifier = async () => {
    if (taches.length === 0) {
      toast.error("Importez ou ajoutez d'abord des tâches avant de lancer la planification.");
      return;
    }
    setLoading(true);
    try {
      const alreadyPlannedIds = new Set((result?.planning ?? []).map((p) => p.id));
      const newTaches = taches.filter((t) => !alreadyPlannedIds.has(t.id));

      if (newTaches.length === 0) {
        toast.info("Toutes les tâches sont déjà planifiées. Modifiez ou ajoutez des tâches pour replanifier.");
        setLoading(false);
        return;
      }

      const newDates = newTaches.map((t) => t.date).sort();
      const newDateDebut = newDates[0] ?? today;
      const newDateFin = newDates[newDates.length - 1] ?? today;

      const existingPlanning = result?.planning ?? [];
      const res = await apiBPlanifier(newTaches, mode, newDateDebut, newDateFin, existingPlanning);

      const mergedPlanning = [
        ...existingPlanning,
        ...res.planning,
      ];
      const mergedResult = {
        ...res,
        planning: mergedPlanning,
        decisions: [...(result?.decisions ?? []), ...res.decisions],
        avertissements: [...(result?.avertissements ?? []), ...res.avertissements],
        echecs: [...(result?.echecs ?? []), ...res.echecs],
        taches_non_planifiees: [...(result?.taches_non_planifiees ?? []), ...res.taches_non_planifiees],
      };

      setResult(mergedResult);
      setActiveSection("calendar");
      if (res.planning.length > 0) {
        setSelectedDate(res.planning[0].date);
      }
      await sauvegarderEtat(taches, mergedResult);
      toast.success(`${res.planning.length} nouvelle(s) tâche(s) planifiée(s)`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la planification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-32 bottom-20 h-96 w-96 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <CalendarCheck2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-foreground">
                Organisateur d&apos;emploi du temps
              </h1>
              <p className="text-[10px] text-foreground/40 leading-tight">CSP + Moteur de règles</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/scenarios"
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5 text-xs font-medium text-foreground/60 hover:text-foreground/90 hover:bg-muted/40 transition-colors"
            >
              <FlaskConical className="h-3.5 w-3.5 text-violet-400" />
              Banc de test Scénarios
            </Link>

            {result && (
              <button
                onClick={resetCalendar}
                title="Vider le calendrier"
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                <span className="hidden sm:inline">Vider</span>
              </button>
            )}

            {/* Mode toggle */}
            <div className="hidden sm:flex items-center gap-1 rounded-lg border border-border/50 bg-muted/20 p-0.5 text-xs">
              {(["csp_seul", "csp_regles"] as SolverMode[]).map((m) => (
                <button
                  key={m}
                  id={`mode-${m}`}
                  onClick={() => setMode(m)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors font-medium ${
                    mode === m
                      ? "bg-background text-foreground shadow-sm"
                      : "text-foreground/50 hover:text-foreground/80"
                  }`}
                >
                  {m === "csp_seul" ? (
                    <Cpu className="h-3 w-3" />
                  ) : (
                    <Brain className="h-3 w-3" />
                  )}
                  {m === "csp_seul" ? "CSP seul" : "CSP + Règles"}
                </button>
              ))}
            </div>

            <DarkModeToggle variants="icon" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Mobile mode toggle */}
        <div className="flex sm:hidden items-center gap-1 rounded-lg border border-border/50 bg-muted/20 p-0.5 text-xs mb-4 w-fit">
          {(["csp_seul", "csp_regles"] as SolverMode[]).map((m) => (
            <button
              key={m}
              id={`mode-mobile-${m}`}
              onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors font-medium ${
                mode === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-foreground/50 hover:text-foreground/80"
              }`}
            >
              {m === "csp_seul" ? <Cpu className="h-3 w-3" /> : <Brain className="h-3 w-3" />}
              {m === "csp_seul" ? "CSP seul" : "CSP + Règles"}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* ── Left panel ────────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Section tabs */}
            <div className="flex gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
              {(["import", "calendar"] as const).map((s) => (
                <button
                  key={s}
                  id={`section-${s}`}
                  onClick={() => setActiveSection(s)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                    activeSection === s
                      ? "bg-background text-foreground shadow-sm"
                      : "text-foreground/50 hover:text-foreground/80"
                  }`}
                >
                  {s === "import" ? (
                    <><ChevronRight className="h-3 w-3" /> Gestion Tâches</>
                  ) : (
                    <><LayoutGrid className="h-3 w-3" /> Décisions & Stats</>
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeSection === "import" ? (
                <motion.div
                  key="import"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  <div className="rounded-2xl border border-border/40 bg-background/60 p-4 shadow-sm backdrop-blur-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">1</span>
                        Importer ou ajouter
                      </h2>
                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-2.5 py-1 text-xs font-semibold transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Ajouter manuellement
                      </button>
                    </div>

                    <ImportTaches existingTaches={taches} onImport={setTaches} />
                  </div>

                  {/* Mode info card */}
                  <div className="rounded-2xl border border-border/40 bg-background/60 p-4 shadow-sm backdrop-blur-sm">
                    <h2 className="text-sm font-semibold text-foreground/80 mb-2 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">2</span>
                      Mode de planification
                    </h2>
                    <div className="space-y-2 text-xs">
                      <div className={`rounded-xl border p-3 cursor-pointer transition-colors ${
                        mode === "csp_seul"
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/40 bg-muted/20 hover:bg-muted/40"
                      }`} onClick={() => setMode("csp_seul")}>
                        <div className="flex items-center gap-2 mb-1">
                          <Cpu className="h-3.5 w-3.5 text-primary" />
                          <span className="font-semibold text-foreground/80">CSP seul</span>
                        </div>
                        <p className="text-foreground/50">Planification par contraintes pures. Retourne un échec si aucune solution n&apos;existe.</p>
                      </div>
                      <div className={`rounded-xl border p-3 cursor-pointer transition-colors ${
                        mode === "csp_regles"
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/40 bg-muted/20 hover:bg-muted/40"
                      }`} onClick={() => setMode("csp_regles")}>
                        <div className="flex items-center gap-2 mb-1">
                          <Brain className="h-3.5 w-3.5 text-primary" />
                          <span className="font-semibold text-foreground/80">CSP + Règles</span>
                        </div>
                        <p className="text-foreground/50">Arbitrage automatique des conflits via un moteur de règles de priorité.</p>
                      </div>
                    </div>
                  </div>

                  {/* Planifier and Save buttons */}
                  <div className="flex gap-2 w-full">
                    <motion.button
                      id="btn-planifier"
                      onClick={handlePlanifier}
                      disabled={loading || taches.length === 0}
                      whileHover={{ scale: taches.length > 0 ? 1.02 : 1 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Planification en cours…</>
                      ) : (
                        <><Play className="h-4 w-4" /> Lancer la planification</>
                      )}
                    </motion.button>
                    <motion.button
                      id="btn-sauvegarder"
                      onClick={saveState}
                      disabled={!result || loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Sauvegarde…</>
                      ) : (
                        <><Save className="h-4 w-4" /> Sauvegarder</>
                      )}
                    </motion.button>
                  </div>

                  {taches.length > 0 && (
                    <p className="text-center text-[11px] text-foreground/40">
                      {taches.length} tâche(s) au total · Mode: <span className="text-primary font-medium">{mode === "csp_seul" ? "CSP seul" : "CSP + Règles"}</span>
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  {result ? (
                    <div className="rounded-2xl border border-border/40 bg-background/60 p-4 shadow-sm backdrop-blur-sm">
                      <h2 className="text-sm font-semibold text-foreground/80 mb-3">Décisions & Arbitrages</h2>
                      <PanneauDecisions
                        decisions={result.decisions}
                        avertissements={result.avertissements}
                        echecs={result.echecs}
                      />
                      {/* Stats */}
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2">
                          <p className="text-lg font-bold text-emerald-400">{result.planning.length}</p>
                          <p className="text-foreground/50">placées</p>
                        </div>
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2">
                          <p className="text-lg font-bold text-amber-400">{result.avertissements.length}</p>
                          <p className="text-foreground/50">avertissements</p>
                        </div>
                        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2">
                          <p className="text-lg font-bold text-rose-400">{result.echecs.length}</p>
                          <p className="text-foreground/50">échecs</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border/40 bg-muted/20 p-8 text-center text-sm text-foreground/40">
                      Lancez d&apos;abord une planification pour voir les décisions ici.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right panel: Calendar ─────────────────────────────── */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/40 bg-background/60 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">3</span>
                  Planning
                  {result && (
                    <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary font-medium">
                      {result.planning.length} tâche(s)
                    </span>
                  )}
                </h2>
                <div className="relative">
                  <SelecteurVue
                    view={view}
                    onViewChange={setView}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                  />
                </div>
              </div>

              {result ? (
                <CalendrierVue
                  planning={result.planning}
                  decisions={result.decisions}
                  view={view}
                  selectedDate={selectedDate}
                  fullTasks={taches}
                  onTaskEdit={handleTaskEdit}
                />
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/40 bg-muted/10 py-20 text-center"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/40 bg-background/60">
                    <CalendarCheck2 className="h-6 w-6 text-foreground/20" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground/40">Aucun planning généré</p>
                    <p className="text-xs text-foreground/30 mt-1">
                      Importez des tâches et lancez la planification pour voir le calendrier.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Unscheduled tasks */}
            {result && result.taches_non_planifiees.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 shadow-sm"
              >
                <h3 className="text-sm font-semibold text-rose-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {result.taches_non_planifiees.length} tâche(s) non planifiée(s)
                </h3>
                <div className="space-y-3">
                  {result.taches_non_planifiees.map((t) => (
                    <div key={t.id} className="rounded-xl border border-rose-500/20 bg-background/60 p-3 space-y-2">
                      {/* Task header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground leading-tight">{t.nom}</p>
                          <p className="text-xs text-foreground/50 mt-0.5">
                            {t.date} &middot; {t.duree_min}min
                            {t.horaire_fixe && <> &middot; fixe {t.horaire_fixe}</>}
                            &middot; <span className={`font-medium capitalize ${
                              t.priorite === 'urgent' ? 'text-rose-400' :
                              t.priorite === 'important' ? 'text-amber-400' : 'text-slate-400'
                            }`}>{t.priorite}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              const found = taches.find((orig) => orig.id === t.id);
                              setInspectingTask({
                                task: found || (t as unknown as Tache),
                                reason: t.raison,
                              });
                            }}
                            className="px-2.5 py-1.5 text-xs font-medium bg-muted/40 text-foreground/70 hover:bg-muted/70 rounded-lg transition-colors flex items-center gap-1"
                            title="Voir le raisonnement complet"
                          >
                            <Eye className="h-3 w-3" />
                            Raison
                          </button>
                          <button
                            onClick={() => {
                              const found = taches.find((orig) => orig.id === t.id);
                              setEditingTask({
                                task: found || ({
                                  id: t.id,
                                  nom: t.nom,
                                  date: t.date,
                                  duree_min: t.duree_min,
                                  horaire_fixe: t.horaire_fixe,
                                  plage_disponibilite: null,
                                  priorite: t.priorite,
                                  dependances: [],
                                } as Tache),
                                reason: t.raison,
                              });
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Wrench className="h-3 w-3" />
                            Placer
                          </button>
                        </div>
                      </div>

                      {/* Conflict reason */}
                      <div className="flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-rose-300 leading-relaxed">{t.raison}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-foreground/50">
              {[
                { label: "Urgent", color: "bg-rose-500/40" },
                { label: "Important", color: "bg-amber-500/40" },
                { label: "Flexible", color: "bg-slate-500/40" },
              ].map(({ label, color }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-sm ${color}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {/* Add Task Modal */}
      <ModalAjoutTache
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTask}
        existingTasks={taches}
        existingPlanning={result?.planning}
        defaultDate={selectedDate}
      />

      {/* Manual Placement / Edit Task Modal */}
      <ModalPlacementManuel
        isOpen={!!editingTask}
        task={editingTask?.task || null}
        failureReason={editingTask?.reason}
        existingPlanning={result?.planning}
        onClose={() => setEditingTask(null)}
        onSave={handleTaskEdit}
      />

      {/* Decision Reasoning Inspection Modal */}
      <ModalRaisonnementTache
        isOpen={!!inspectingTask}
        task={inspectingTask?.task || null}
        decisionList={result?.decisions}
        planningItem={result?.planning.find((p) => p.id === inspectingTask?.task.id)}
        failureReason={inspectingTask?.reason}
        onClose={() => setInspectingTask(null)}
        onOpenManualPlacement={(targetTask) => {
          setEditingTask({ task: targetTask });
        }}
        originalTask={taches.find((t) => t.id === inspectingTask?.task.id)}
      />
    </main>
  );
}


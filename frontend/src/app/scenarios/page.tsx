"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CalendarCheck2,
  FlaskConical,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Cpu,
  Brain,
  Clock,
  GitBranch,
  Layers,
  Zap,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Users,
  CalendarDays,
  ListTodo,
  Calendar as CalendarIcon,
  Sparkles,
  Timer,
  Check,
  Plus,
  Eye,
  Wrench,
  RotateCcw,
} from "lucide-react";
import { planifier, Tache, PlanningResult, PlanningItem } from "@/lib/api";
import DarkModeToggle from "@/components/DarkModeToggle";
import CalendrierVue from "@/components/CalendrierVue";
import SelecteurVue, { ViewMode } from "@/components/SelecteurVue";
import ModalAjoutTache from "@/components/ModalAjoutTache";
import ModalPlacementManuel from "@/components/ModalPlacementManuel";
import ModalRaisonnementTache from "@/components/ModalRaisonnementTache";
import { toast } from "sonner";

// ─── Helpers ────────────────────────────────────────────────────────────────

function addDays(base: Date, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

// ─── Couleurs sémantiques par priorité ───────────────────────────────────────

const PRIORITE_META: Record<
  "urgent" | "important" | "flexible",
  { label: string; badge: string; bar: string; dot: string }
> = {
  urgent: {
    label: "Urgente",
    badge: "bg-red-500/10 text-red-500 border border-red-500/30",
    bar: "bg-red-500",
    dot: "bg-red-500",
  },
  important: {
    label: "Importante",
    badge: "bg-amber-400/10 text-amber-500 border border-amber-400/30",
    bar: "bg-amber-400",
    dot: "bg-amber-400",
  },
  flexible: {
    label: "Flexible",
    badge: "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20",
    bar: "bg-foreground/30",
    dot: "bg-neutral-500",
  },
};

// ─── Scenario definitions ────────────────────────────────────────────────────

interface ScenarioDefinition {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tags: { label: string; color: string }[];
  complexity: 1 | 2 | 3;
  tasks: (today: Date) => Tache[];
}

const SCENARIOS: ScenarioDefinition[] = [
  {
    id: "semaine-standard",
    title: "Semaine standard",
    description:
      "6 tâches sur 5 jours avec des priorités mixtes et aucune dépendance. Cas de base pour valider la répartition équilibrée.",
    icon: <CalendarDays className="h-5 w-5" />,
    tags: [
      { label: "6 tâches", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
      { label: "5 jours", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
      { label: "Débutant", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
    ],
    complexity: 1,
    tasks: (today) => [
      { id: "t1", nom: "Réunion d'équipe", date: addDays(today, 0), duree_min: 60, horaire_fixe: "09:00", plage_disponibilite: null, priorite: "urgent", dependances: [] },
      { id: "t2", nom: "Rapport hebdomadaire", date: addDays(today, 0), duree_min: 90, horaire_fixe: null, plage_disponibilite: null, priorite: "important", dependances: [] },
      { id: "t3", nom: "Revue de code", date: addDays(today, 1), duree_min: 45, horaire_fixe: null, plage_disponibilite: null, priorite: "important", dependances: [] },
      { id: "t4", nom: "Documentation", date: addDays(today, 2), duree_min: 120, horaire_fixe: null, plage_disponibilite: null, priorite: "flexible", dependances: [] },
      { id: "t5", nom: "Formation interne", date: addDays(today, 3), duree_min: 180, horaire_fixe: "14:00", plage_disponibilite: null, priorite: "important", dependances: [] },
      { id: "t6", nom: "Bilan de semaine", date: addDays(today, 4), duree_min: 30, horaire_fixe: "17:00", plage_disponibilite: null, priorite: "flexible", dependances: [] },
    ],
  },
  {
    id: "dependances-en-chaine",
    title: "Dépendances en chaîne",
    description:
      "5 tâches formant une chaîne A→B→C→D→E. Teste la résolution stricte des contraintes de précédence et d'ordonnancement.",
    icon: <GitBranch className="h-5 w-5" />,
    tags: [
      { label: "5 tâches", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
      { label: "Dépendances", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
      { label: "Intermédiaire", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
    ],
    complexity: 2,
    tasks: (today) => [
      { id: "d1", nom: "Analyse des besoins", date: addDays(today, 0), duree_min: 60, horaire_fixe: null, plage_disponibilite: null, priorite: "urgent", dependances: [] },
      { id: "d2", nom: "Conception système", date: addDays(today, 1), duree_min: 90, horaire_fixe: null, plage_disponibilite: null, priorite: "urgent", dependances: ["d1"] },
      { id: "d3", nom: "Développement", date: addDays(today, 2), duree_min: 120, horaire_fixe: null, plage_disponibilite: null, priorite: "important", dependances: ["d2"] },
      { id: "d4", nom: "Tests unitaires", date: addDays(today, 3), duree_min: 60, horaire_fixe: null, plage_disponibilite: null, priorite: "important", dependances: ["d3"] },
      { id: "d5", nom: "Déploiement", date: addDays(today, 4), duree_min: 45, horaire_fixe: null, plage_disponibilite: null, priorite: "urgent", dependances: ["d4"] },
    ],
  },
  {
    id: "conflits-priorites",
    title: "Conflits de priorités",
    description:
      "4 tâches urgentes en compétition sur les mêmes créneaux. Illustre la puissance de l'arbitrage par règles métier.",
    icon: <Zap className="h-5 w-5" />,
    tags: [
      { label: "Tout urgent", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
      { label: "1 jour", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
      { label: "Conflits", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
    ],
    complexity: 2,
    tasks: (today) => [
      { id: "c1", nom: "Présentation client", date: addDays(today, 0), duree_min: 120, horaire_fixe: "09:00", plage_disponibilite: null, priorite: "urgent", dependances: [] },
      { id: "c2", nom: "Réunion direction", date: addDays(today, 0), duree_min: 90, horaire_fixe: "10:00", plage_disponibilite: null, priorite: "urgent", dependances: [] },
      { id: "c3", nom: "Démo produit", date: addDays(today, 0), duree_min: 60, horaire_fixe: "11:00", plage_disponibilite: null, priorite: "urgent", dependances: [] },
      { id: "c4", nom: "Appel d'urgence", date: addDays(today, 0), duree_min: 30, horaire_fixe: null, plage_disponibilite: null, priorite: "urgent", dependances: [] },
    ],
  },
  {
    id: "horaires-fixes-flexibles",
    title: "Horaires fixes & flexibles",
    description:
      "Mix de créneaux imposés et de tâches à caser dans les fenêtres disponibles. Optimise l'occupation du temps.",
    icon: <Clock className="h-5 w-5" />,
    tags: [
      { label: "8 tâches", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
      { label: "Horaires fixes", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
      { label: "Intermédiaire", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
    ],
    complexity: 2,
    tasks: (today) => [
      { id: "h1", nom: "Stand-up matinal", date: addDays(today, 0), duree_min: 15, horaire_fixe: "08:30", plage_disponibilite: null, priorite: "urgent", dependances: [] },
      { id: "h2", nom: "Bloc de travail", date: addDays(today, 0), duree_min: 120, horaire_fixe: null, plage_disponibilite: [["09:00", "12:00"]], priorite: "important", dependances: [] },
      { id: "h3", nom: "Déjeuner d'affaires", date: addDays(today, 0), duree_min: 60, horaire_fixe: "12:30", plage_disponibilite: null, priorite: "important", dependances: [] },
      { id: "h4", nom: "Revue de sprint", date: addDays(today, 1), duree_min: 90, horaire_fixe: "14:00", plage_disponibilite: null, priorite: "urgent", dependances: [] },
      { id: "h5", nom: "Rédaction article", date: addDays(today, 1), duree_min: 60, horaire_fixe: null, plage_disponibilite: null, priorite: "flexible", dependances: [] },
      { id: "h6", nom: "Formation en ligne", date: addDays(today, 2), duree_min: 90, horaire_fixe: null, plage_disponibilite: [["10:00", "16:00"]], priorite: "flexible", dependances: [] },
      { id: "h7", nom: "Appel hebdo", date: addDays(today, 3), duree_min: 30, horaire_fixe: "09:00", plage_disponibilite: null, priorite: "important", dependances: [] },
      { id: "h8", nom: "Veille techno", date: addDays(today, 4), duree_min: 45, horaire_fixe: null, plage_disponibilite: null, priorite: "flexible", dependances: [] },
    ],
  },
  {
    id: "surcharge",
    title: "Semaine surchargée",
    description:
      "12 tâches condensées sur 3 jours avec contraintes denses. Permet d'observer la gestion de surcharge et d'échecs.",
    icon: <Layers className="h-5 w-5" />,
    tags: [
      { label: "12 tâches", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
      { label: "3 jours", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
      { label: "Avancé", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
    ],
    complexity: 3,
    tasks: (today) => [
      { id: "s1", nom: "Kick-off projet A", date: addDays(today, 0), duree_min: 60, horaire_fixe: "08:00", plage_disponibilite: null, priorite: "urgent", dependances: [] },
      { id: "s2", nom: "Sprint planning", date: addDays(today, 0), duree_min: 120, horaire_fixe: "09:30", plage_disponibilite: null, priorite: "urgent", dependances: [] },
      { id: "s3", nom: "Réunion RH", date: addDays(today, 0), duree_min: 45, horaire_fixe: "11:00", plage_disponibilite: null, priorite: "important", dependances: [] },
      { id: "s4", nom: "Audit sécurité", date: addDays(today, 0), duree_min: 180, horaire_fixe: "14:00", plage_disponibilite: null, priorite: "urgent", dependances: [] },
      { id: "s5", nom: "Point direction", date: addDays(today, 1), duree_min: 90, horaire_fixe: "08:00", plage_disponibilite: null, priorite: "urgent", dependances: ["s4"] },
      { id: "s6", nom: "Demo client B", date: addDays(today, 1), duree_min: 60, horaire_fixe: "10:00", plage_disponibilite: null, priorite: "urgent", dependances: [] },
      { id: "s7", nom: "Revue architecture", date: addDays(today, 1), duree_min: 90, horaire_fixe: "14:00", plage_disponibilite: null, priorite: "important", dependances: ["s5"] },
      { id: "s8", nom: "Rapport mensuel", date: addDays(today, 1), duree_min: 120, horaire_fixe: null, plage_disponibilite: null, priorite: "important", dependances: [] },
      { id: "s9", nom: "Formation équipe", date: addDays(today, 2), duree_min: 180, horaire_fixe: "09:00", plage_disponibilite: null, priorite: "important", dependances: [] },
      { id: "s10", nom: "Rétrospective", date: addDays(today, 2), duree_min: 90, horaire_fixe: "13:00", plage_disponibilite: null, priorite: "urgent", dependances: ["s9"] },
      { id: "s11", nom: "Release notes", date: addDays(today, 2), duree_min: 60, horaire_fixe: null, plage_disponibilite: null, priorite: "flexible", dependances: ["s7"] },
      { id: "s12", nom: "Veille concurrentielle", date: addDays(today, 2), duree_min: 45, horaire_fixe: null, plage_disponibilite: null, priorite: "flexible", dependances: [] },
    ],
  },
  {
    id: "projet-equipe",
    title: "Projet d'équipe",
    description:
      "Sprint de 5 jours complet avec tâches parallèles de frontend/backend, intégration continue et points quotidiens.",
    icon: <Users className="h-5 w-5" />,
    tags: [
      { label: "9 tâches", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
      { label: "Sprint complet", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
      { label: "Avancé", color: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30" },
    ],
    complexity: 3,
    tasks: (today) => [
      { id: "p1", nom: "Sprint planning", date: addDays(today, 0), duree_min: 120, horaire_fixe: "09:00", plage_disponibilite: null, priorite: "urgent", dependances: [] },
      { id: "p2", nom: "Tâche frontend A", date: addDays(today, 1), duree_min: 180, horaire_fixe: null, plage_disponibilite: null, priorite: "important", dependances: ["p1"] },
      { id: "p3", nom: "Tâche backend B", date: addDays(today, 1), duree_min: 150, horaire_fixe: null, plage_disponibilite: null, priorite: "important", dependances: ["p1"] },
      { id: "p4", nom: "Daily scrum J2", date: addDays(today, 1), duree_min: 15, horaire_fixe: "09:00", plage_disponibilite: null, priorite: "urgent", dependances: [] },
      { id: "p5", nom: "Intégration A+B", date: addDays(today, 2), duree_min: 120, horaire_fixe: null, plage_disponibilite: null, priorite: "urgent", dependances: ["p2", "p3"] },
      { id: "p6", nom: "Daily scrum J3", date: addDays(today, 2), duree_min: 15, horaire_fixe: "09:00", plage_disponibilite: null, priorite: "urgent", dependances: [] },
      { id: "p7", nom: "Tests d'intégration", date: addDays(today, 3), duree_min: 90, horaire_fixe: null, plage_disponibilite: null, priorite: "urgent", dependances: ["p5"] },
      { id: "p8", nom: "Correction bugs", date: addDays(today, 3), duree_min: 60, horaire_fixe: null, plage_disponibilite: null, priorite: "important", dependances: ["p7"] },
      { id: "p9", nom: "Sprint review", date: addDays(today, 4), duree_min: 60, horaire_fixe: "15:00", plage_disponibilite: null, priorite: "urgent", dependances: ["p8"] },
    ],
  },
];

// ─── Subcomponents ───────────────────────────────────────────────────────────

function ComplexityDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`h-1.5 w-3.5 rounded-full transition-colors ${
            i <= level
              ? level === 1
                ? "bg-neutral-400"
                : level === 2
                ? "bg-neutral-400"
                : "bg-neutral-400"
              : "bg-border/40"
          }`}
        />
      ))}
    </div>
  );
}

interface ModeResultCardProps {
  mode: "csp_seul" | "csp_regles";
  result: PlanningResult | null;
  loading: boolean;
  taskCount: number;
  onInspectTask?: (task: Tache | PlanningItem, reason?: string) => void;
  onPlaceTask?: (task: Tache, reason?: string) => void;
  allTasks?: Tache[];
}

function ModeResultCard({
  mode,
  result,
  loading,
  taskCount,
  onInspectTask,
  onPlaceTask,
  allTasks = [],
}: ModeResultCardProps) {
  const [showDecisions, setShowDecisions] = useState(false);
  const isCspRegles = mode === "csp_regles";

  return (
    <div
      className={`rounded-2xl border p-4 space-y-4 ${
        isCspRegles
          ? "border-emerald-500/25 bg-emerald-500/5"
          : "border-sky-500/25 bg-sky-500/5"
      }`}
    >
      {/* Mode header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              isCspRegles ? "bg-emerald-500/15" : "bg-sky-500/15"
            }`}
          >
            {isCspRegles ? (
              <Brain className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Cpu className="h-3.5 w-3.5 text-sky-500" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isCspRegles ? "CSP + Règles" : "CSP seul"}
            </p>
            <p className="text-[10px] text-foreground/40">
              {isCspRegles ? "Arbitrage auto des conflits" : "Contraintes pures"}
            </p>
          </div>
        </div>
        {result && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              result.planning.length === taskCount
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-amber-400/15 text-amber-500"
            }`}
          >
            {result.planning.length}/{taskCount} placées
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-foreground/40">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Planification en cours…
        </div>
      )}

      {/* No result yet */}
      {!loading && !result && (
        <div className="flex items-center justify-center py-8 text-xs text-foreground/30">
          Cliquez sur « Lancer la planification » pour générer les résultats
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className={`rounded-xl border p-3 text-center ${
                isCspRegles
                  ? "border-emerald-500/20 bg-emerald-500/10"
                  : "border-sky-500/20 bg-sky-500/10"
              }`}
            >
              <p className={`text-xl font-bold ${isCspRegles ? "text-emerald-500" : "text-sky-500"}`}>
                {result.planning.length}
              </p>
              <p className="text-[10px] text-foreground/50 mt-0.5">placées</p>
            </div>
            <div
              className={`rounded-xl border p-3 text-center ${
                result.taches_non_planifiees.length > 0
                  ? "border-red-500/25 bg-red-500/5"
                  : "border-border/30 bg-muted/20"
              }`}
            >
              <p className={`text-xl font-bold ${result.taches_non_planifiees.length > 0 ? "text-red-500" : "text-foreground/60"}`}>
                {result.taches_non_planifiees.length}
              </p>
              <p className="text-[10px] text-foreground/50 mt-0.5">non planifiées</p>
            </div>
            <div
              className={`rounded-xl border p-3 text-center ${
                result.avertissements.length > 0
                  ? "border-amber-400/25 bg-amber-400/5"
                  : "border-border/30 bg-muted/20"
              }`}
            >
              <p className={`text-xl font-bold ${result.avertissements.length > 0 ? "text-amber-500" : "text-foreground/60"}`}>
                {result.avertissements.length}
              </p>
              <p className="text-[10px] text-foreground/50 mt-0.5">avertissements</p>
            </div>
            <div
              className={`rounded-xl border p-3 text-center ${
                Math.round((result.planning.length / Math.max(taskCount, 1)) * 100) === 100
                  ? "border-emerald-500/25 bg-emerald-500/5"
                  : "border-border/30 bg-muted/20"
              }`}
            >
              <p
                className={`text-xl font-bold ${
                  Math.round((result.planning.length / Math.max(taskCount, 1)) * 100) === 100
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-foreground/70"
                }`}
              >
                {Math.round((result.planning.length / Math.max(taskCount, 1)) * 100)}%
              </p>
              <p className="text-[10px] text-foreground/50 mt-0.5">taux de succès</p>
            </div>
          </div>

          {/* Unplanned tasks */}
          {result.taches_non_planifiees.length > 0 && (
            <div className="rounded-xl border border-neutral-500/20 bg-neutral-500/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                {result.taches_non_planifiees.length} non planifiée(s)
              </p>
              {result.taches_non_planifiees.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl bg-background/60 p-2.5 border border-neutral-500/15 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{t.nom}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onInspectTask?.(t as any, t.raison)}
                        className="px-2 py-0.5 text-[10px] rounded bg-muted/40 hover:bg-muted/70 text-foreground/70 flex items-center gap-0.5"
                      >
                        <Eye className="h-2.5 w-2.5" />
                        Raison
                      </button>
                      <button
                        onClick={() => {
                          const orig = allTasks.find((x) => x.id === t.id);
                          onPlaceTask?.(
                            orig || ({
                              id: t.id,
                              nom: t.nom,
                              date: t.date,
                              duree_min: t.duree_min,
                              horaire_fixe: t.horaire_fixe,
                              plage_disponibilite: null,
                              priorite: t.priorite,
                              dependances: [],
                            } as Tache),
                            t.raison
                          );
                        }}
                        className="px-2 py-0.5 text-[10px] rounded bg-primary/15 hover:bg-primary/25 text-primary font-medium flex items-center gap-0.5"
                      >
                        <Wrench className="h-2.5 w-2.5" />
                        Ajuster
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-snug">{t.raison}</p>
                </div>
              ))}
            </div>
          )}

          {/* Decisions toggle */}
          {result.decisions.length > 0 && (
            <div>
              <button
                onClick={() => setShowDecisions((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs font-medium text-foreground/60 hover:bg-muted/40 transition-colors"
              >
                <span>{result.decisions.length} décision(s) / arbitrage(s)</span>
                {showDecisions ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
              <AnimatePresence>
                {showDecisions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {result.decisions.map((d, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-border/30 bg-background/40 px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-3 w-3 text-neutral-400 shrink-0" />
                              <span className="font-medium text-foreground/80 truncate">
                                {d.tache_id}
                              </span>
                            </div>
                            <span className="text-[10px] text-foreground/40 font-mono">
                              {d.creneau || d.date}
                            </span>
                          </div>
                          {d.raison && (
                            <p className="text-foreground/50 pl-4.5 leading-relaxed text-[11px]">
                              {d.raison}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Warnings */}
          {result.avertissements.length > 0 && (
            <div className="rounded-xl border border-neutral-500/20 bg-neutral-500/5 p-3 space-y-1">
              <p className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                Avertissements ({result.avertissements.length})
              </p>
              {result.avertissements.map((a, i) => (
                <p key={i} className="text-xs text-foreground/60 leading-relaxed">
                  • {a}
                </p>
              ))}
            </div>
          )}

          {/* Echecs */}
          {result.echecs.length > 0 && (
            <div className="rounded-xl border border-neutral-500/20 bg-neutral-500/5 p-3 space-y-1">
              <p className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                <XCircle className="h-3 w-3" />
                Échecs CSP
              </p>
              {result.echecs.map((e, i) => (
                <p key={i} className="text-xs text-foreground/60 leading-relaxed">
                  • {e.raison}
                </p>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

type ActiveTab = "tasks" | "comparison" | "calendar";

export default function ScenariosPage() {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().slice(0, 10), [today]);

  const [activeScenarioId, setActiveScenarioId] = useState<string>("semaine-standard");
  const [activeTab, setActiveTab] = useState<ActiveTab>("tasks");

  // Custom modified/added tasks per scenario
  const [customTasksMap, setCustomTasksMap] = useState<Record<string, Tache[]>>({});

  const [loadingCsp, setLoadingCsp] = useState(false);
  const [loadingRegles, setLoadingRegles] = useState(false);
  const [resultCsp, setResultCsp] = useState<PlanningResult | null>(null);
  const [resultRegles, setResultRegles] = useState<PlanningResult | null>(null);

  // Calendar view controls
  const [calendarMode, setCalendarMode] = useState<"csp_regles" | "csp_seul">("csp_regles");
  const [view, setView] = useState<ViewMode>("semaine");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<{ task: Tache; reason?: string } | null>(null);
  const [inspectingTask, setInspectingTask] = useState<{
    task: Tache | PlanningItem;
    reason?: string;
  } | null>(null);

  const activeScenario = useMemo(
    () => SCENARIOS.find((s) => s.id === activeScenarioId) ?? SCENARIOS[0],
    [activeScenarioId]
  );

  const currentTasks = useMemo(() => {
    if (customTasksMap[activeScenarioId]) {
      return customTasksMap[activeScenarioId];
    }
    return activeScenario.tasks(today);
  }, [customTasksMap, activeScenarioId, activeScenario, today]);

  // Set initial selected date to match scenario tasks
  useEffect(() => {
    if (currentTasks.length > 0) {
      setSelectedDate(currentTasks[0].date);
    }
  }, [currentTasks]);

  // Compute total duration of tasks
  const totalDurationMin = useMemo(
    () => currentTasks.reduce((acc, t) => acc + t.duree_min, 0),
    [currentTasks]
  );

  const handleRun = async (tasksToRun: Tache[] = currentTasks) => {
    const dates = tasksToRun.map((t) => t.date).sort();
    const dateDebut = dates[0] ?? todayStr;
    const dateFin = dates[dates.length - 1] ?? todayStr;

    setResultCsp(null);
    setResultRegles(null);
    setLoadingCsp(true);
    setLoadingRegles(true);

    const runMode = async (mode: "csp_seul" | "csp_regles") => {
      try {
        const res = await planifier(tasksToRun, mode, dateDebut, dateFin);
        if (mode === "csp_seul") {
          setResultCsp(res);
          setLoadingCsp(false);
        } else {
          setResultRegles(res);
          setLoadingRegles(false);
        }
      } catch (e: unknown) {
        toast.error(
          `Erreur ${mode}: ${e instanceof Error ? e.message : "Erreur inconnue"}`
        );
        if (mode === "csp_seul") setLoadingCsp(false);
        else setLoadingRegles(false);
      }
    };

    // Run both in parallel
    await Promise.all([runMode("csp_seul"), runMode("csp_regles")]);
    toast.success(`Planification terminée pour « ${activeScenario.title} »`);
    setActiveTab("comparison");
  };

  const handleAddTask = (newTask: Tache) => {
    const updated = [...currentTasks, newTask];
    setCustomTasksMap((prev) => ({
      ...prev,
      [activeScenarioId]: updated,
    }));
    toast.success(`Tâche « ${newTask.nom} » ajoutée au scénario !`);
  };

  const handleSaveEditedTask = (updatedTask: Tache) => {
    const updated = currentTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    if (!updated.some((t) => t.id === updatedTask.id)) {
      updated.push(updatedTask);
    }
    setCustomTasksMap((prev) => ({
      ...prev,
      [activeScenarioId]: updated,
    }));
    toast.success(`Tâche « ${updatedTask.nom} » modifiée.`);
    handleRun(updated);
  };

  const handleResetScenario = () => {
    setCustomTasksMap((prev) => {
      const copy = { ...prev };
      delete copy[activeScenarioId];
      return copy;
    });
    setResultCsp(null);
    setResultRegles(null);
    toast.info("Scénario réinitialisé aux données d'origine.");
  };

  const isRunning = loadingCsp || loadingRegles;
  const hasResults = !!(resultCsp || resultRegles);

  // Active result for calendar view
  const activeCalendarResult = calendarMode === "csp_regles" ? resultRegles : resultCsp;

  // Taux de succès global (pour le badge du panneau latéral)
  const succRate = activeCalendarResult
    ? Math.round((activeCalendarResult.planning.length / Math.max(currentTasks.length, 1)) * 100)
    : 0;

  // Progression de planification par priorité (barres animées)
  const priorityStats = useMemo(() => {
    const placedIds = new Set((activeCalendarResult?.planning ?? []).map((p) => p.id));
    return (["urgent", "important", "flexible"] as const).map((priorite) => {
      const total = currentTasks.filter((t) => t.priorite === priorite).length;
      const placed = currentTasks.filter(
        (t) => t.priorite === priorite && placedIds.has(t.id)
      ).length;
      return {
        priorite,
        total,
        placed,
        pct: total > 0 ? Math.round((placed / total) * 100) : 100,
      };
    });
  }, [activeCalendarResult, currentTasks]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-1.5 text-xs font-medium text-foreground/60 hover:text-foreground/90 hover:bg-muted/40 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Accueil
            </Link>
            <div className="h-4 w-px bg-border/50" />
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-500/15 text-neutral-400">
                <FlaskConical className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-sm font-semibold leading-tight text-foreground">
                  Banc d'Essai Scénarios CSP
                </h1>
                <p className="text-[10px] text-foreground/40 leading-tight">
                  Visualisation, raisonnement et calendrier interactif
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleRun()}
              disabled={isRunning}
              className="hidden sm:flex items-center gap-2 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {isRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {isRunning ? "Planification..." : "Lancer le scénario"}
            </button>
            <DarkModeToggle variants="icon" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Scenario Carousel / Grid Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/50 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Choisir un scénario ({SCENARIOS.length})
            </h2>
            <span className="text-[11px] text-foreground/40">
              Cliquez pour prévisualiser & exécuter
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {SCENARIOS.map((scenario) => {
              const isSelected = scenario.id === activeScenarioId;
              const tasksForCard = customTasksMap[scenario.id] || scenario.tasks(today);
              const taskCount = tasksForCard.length;
              return (
                <button
                  key={scenario.id}
                  onClick={() => {
                    if (scenario.id !== activeScenarioId) {
                      setActiveScenarioId(scenario.id);
                      setResultCsp(null);
                      setResultRegles(null);
                      setActiveTab("tasks");
                    }
                  }}
                  className={`relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-200 backdrop-blur-sm ${
                    isSelected
                      ? "border-primary/60 bg-primary/10 shadow-md shadow-primary/10 ring-1 ring-primary/40"
                      : "border-border/40 bg-background/60 hover:border-primary/30 hover:bg-background/90"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                  )}

                  <div>
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-xl mb-2.5 transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/40 text-foreground/60"
                      }`}
                    >
                      {scenario.icon}
                    </div>
                    <h3 className="text-xs font-semibold text-foreground leading-snug">
                      {scenario.title}
                    </h3>
                    <p className="text-[11px] text-foreground/45 line-clamp-2 mt-1">
                      {scenario.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/30 flex items-center justify-between text-[10px] text-foreground/50">
                    <span className="font-medium text-foreground/70">{taskCount} tâches</span>
                    <ComplexityDots level={scenario.complexity} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Scenario Header & Action Banner */}
        <div className="rounded-2xl border border-border/40 bg-background/60 p-4 sm:p-5 shadow-sm backdrop-blur-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/20">
                {activeScenario.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    {activeScenario.title}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    {activeScenario.tags.map((t) => (
                      <span
                        key={t.label}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${t.color}`}
                      >
                        {t.label}
                      </span>
                    ))}
                    {customTasksMap[activeScenarioId] && (
                      <span className="rounded-full border border-neutral-500/40 bg-neutral-500/10 px-2 py-0.5 text-[10px] font-semibold text-neutral-300">
                        Modifié
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-foreground/60 mt-1 max-w-2xl">
                  {activeScenario.description}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {customTasksMap[activeScenarioId] && (
                <button
                  onClick={handleResetScenario}
                  className="flex items-center gap-1.5 rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-xs font-semibold text-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Réinitialiser
                </button>
              )}
              <motion.button
                onClick={() => handleRun()}
                disabled={isRunning}
                whileHover={{ scale: isRunning ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calcul des deux modes...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    {hasResults ? "Relancer la planification" : "Lancer la planification (2 modes)"}
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Quick Scenario Meta Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/30 text-xs">
            <div className="flex items-center gap-2 rounded-xl bg-muted/20 px-3 py-2 border border-border/30">
              <ListTodo className="h-4 w-4 text-primary" />
              <div>
                <span className="text-[10px] text-foreground/40 block">Tâches à placer</span>
                <span className="font-semibold text-foreground">{currentTasks.length} tâches</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-muted/20 px-3 py-2 border border-border/30">
              <Timer className="h-4 w-4 text-neutral-400" />
              <div>
                <span className="text-[10px] text-foreground/40 block">Volume horaire</span>
                <span className="font-semibold text-foreground">{formatMinutes(totalDurationMin)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-muted/20 px-3 py-2 border border-border/30">
              <Zap className="h-4 w-4 text-neutral-400" />
              <div>
                <span className="text-[10px] text-foreground/40 block">Tâches urgentes</span>
                <span className="font-semibold text-foreground">
                  {currentTasks.filter((t) => t.priorite === "urgent").length}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-muted/20 px-3 py-2 border border-border/30">
              <GitBranch className="h-4 w-4 text-neutral-400" />
              <div>
                <span className="text-[10px] text-foreground/40 block">Avec dépendances</span>
                <span className="font-semibold text-foreground">
                  {currentTasks.filter((t) => t.dependances.length > 0).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
          <div className="flex gap-1.5 bg-muted/20 p-1 rounded-xl border border-border/40">
            <button
              onClick={() => setActiveTab("tasks")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "tasks"
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-foreground/50 hover:text-foreground/80 hover:bg-muted/40"
              }`}
            >
              <ListTodo className={`h-3.5 w-3.5 ${activeTab === "tasks" ? "text-primary" : "text-neutral-400"}`} />
              Liste des tâches
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  activeTab === "tasks"
                    ? "bg-primary/15 text-primary"
                    : "bg-muted/60 text-foreground/50"
                }`}
              >
                {currentTasks.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("comparison")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "comparison"
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-foreground/50 hover:text-foreground/80 hover:bg-muted/40"
              }`}
            >
              <BarChart3 className={`h-3.5 w-3.5 ${activeTab === "comparison" ? "text-violet-500" : "text-neutral-400"}`} />
              Comparatif CSP vs Règles
              {hasResults && (
                <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "calendar"
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-foreground/50 hover:text-foreground/80 hover:bg-muted/40"
              }`}
            >
              <CalendarIcon className={`h-3.5 w-3.5 ${activeTab === "calendar" ? "text-emerald-500" : "text-neutral-400"}`} />
              Vue Calendrier
              {activeCalendarResult ? (
                <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">
                  {activeCalendarResult.planning.length}/{currentTasks.length}
                </span>
              ) : hasResults ? (
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              ) : null}
            </button>
          </div>

          {activeTab === "calendar" && hasResults && (
            <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-xl border border-border/40 text-xs">
              <button
                onClick={() => setCalendarMode("csp_regles")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  calendarMode === "csp_regles"
                    ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shadow-sm"
                    : "text-foreground/50 hover:text-foreground/80"
                }`}
              >
                <Brain className={`h-3 w-3 ${calendarMode === "csp_regles" ? "text-emerald-500" : "text-neutral-400"}`} />
                CSP + Règles ({resultRegles?.planning.length ?? 0})
              </button>
              <button
                onClick={() => setCalendarMode("csp_seul")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  calendarMode === "csp_seul"
                    ? "bg-sky-500/15 text-sky-500 border border-sky-500/30 shadow-sm"
                    : "text-foreground/50 hover:text-foreground/80"
                }`}
              >
                <Cpu className={`h-3 w-3 ${calendarMode === "csp_seul" ? "text-sky-500" : "text-neutral-400"}`} />
                CSP seul ({resultCsp?.planning.length ?? 0})
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Task List to Plan */}
        {activeTab === "tasks" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-primary" />
                Détail des {currentTasks.length} tâches à planifier pour « {activeScenario.title} »
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 text-xs font-semibold transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter une tâche
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {currentTasks.map((t, idx) => {
                // Find if planned in current mode
                const plannedInRegles = resultRegles?.planning.find((p) => p.id === t.id);
                const unplannedInRegles = resultRegles?.taches_non_planifiees.find((u) => u.id === t.id);

                return (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-border/40 bg-background/60 p-4 space-y-3 shadow-sm hover:border-primary/30 transition-all backdrop-blur-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold font-mono">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-foreground leading-tight">
                            {t.nom}
                          </h4>
                          <span className="text-[10px] text-foreground/40 font-mono">ID: {t.id}</span>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          t.priorite === "urgent"
                            ? "bg-red-500/10 text-red-500 border border-red-500/30"
                            : t.priorite === "important"
                            ? "bg-amber-400/10 text-amber-500 border border-amber-400/30"
                            : "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20"
                        }`}
                      >
                        {t.priorite}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-foreground/70 bg-muted/15 p-2.5 rounded-xl border border-border/30">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground/40 flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" /> Date
                        </span>
                        <span className="font-medium text-foreground">{t.date}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-foreground/40 flex items-center gap-1">
                          <Timer className="h-3 w-3" /> Durée
                        </span>
                        <span className="font-medium text-foreground">{formatMinutes(t.duree_min)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-foreground/40 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Contrainte horaire
                        </span>
                        {t.horaire_fixe ? (
                          <span className="font-semibold text-neutral-400 bg-neutral-500/10 px-1.5 py-0.5 rounded border border-neutral-500/20">
                            Fixe {t.horaire_fixe}
                          </span>
                        ) : t.plage_disponibilite ? (
                          <span className="font-medium text-neutral-400">
                            {t.plage_disponibilite.map(([s, e]) => `${s}-${e}`).join(", ")}
                          </span>
                        ) : (
                          <span className="text-foreground/40 italic">Flexible</span>
                        )}
                      </div>

                      {t.dependances.length > 0 && (
                        <div className="pt-1.5 border-t border-border/30 flex items-center justify-between">
                          <span className="text-foreground/40 flex items-center gap-1">
                            <GitBranch className="h-3 w-3 text-neutral-400" /> Précédence
                          </span>
                          <div className="flex gap-1 flex-wrap justify-end">
                            {t.dependances.map((depId) => {
                              const depTask = currentTasks.find((x) => x.id === depId);
                              return (
                                <span
                                  key={depId}
                                  className="rounded bg-neutral-500/15 border border-neutral-500/30 px-1.5 py-0.5 text-[10px] text-neutral-300 font-medium"
                                  title={`Dépend de ${depTask?.nom ?? depId}`}
                                >
                                  ➔ {depTask?.nom ?? depId}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons on card */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {hasResults ? (
                        <button
                          onClick={() =>
                            setInspectingTask({
                              task: t,
                              reason: unplannedInRegles?.raison,
                            })
                          }
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-border/40 bg-muted/20 py-1.5 text-[11px] font-medium text-foreground/70 hover:bg-muted/40 transition-colors"
                        >
                          <Eye className="h-3 w-3 text-neutral-400" />
                          Raisonnement
                        </button>
                      ) : (
                        <span className="text-[10px] text-foreground/30 italic">
                          Non planifiée
                        </span>
                      )}

                      <button
                        onClick={() =>
                          setEditingTask({
                            task: t,
                            reason: unplannedInRegles?.raison,
                          })
                        }
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary py-1.5 text-[11px] font-semibold transition-colors"
                      >
                        <Wrench className="h-3 w-3" />
                        Ajuster
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Tab 2: Comparison & Decisions */}
        {activeTab === "comparison" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Side-by-side comparison cards */}
            <div className="grid gap-4 md:grid-cols-2">
              <ModeResultCard
                mode="csp_seul"
                result={resultCsp}
                loading={loadingCsp}
                taskCount={currentTasks.length}
                allTasks={currentTasks}
                onInspectTask={(t, r) => setInspectingTask({ task: t, reason: r })}
                onPlaceTask={(t, r) => setEditingTask({ task: t, reason: r })}
              />
              <ModeResultCard
                mode="csp_regles"
                result={resultRegles}
                loading={loadingRegles}
                taskCount={currentTasks.length}
                allTasks={currentTasks}
                onInspectTask={(t, r) => setInspectingTask({ task: t, reason: r })}
                onPlaceTask={(t, r) => setEditingTask({ task: t, reason: r })}
              />
            </div>

            {/* Differential comparison table */}
            {resultCsp && resultRegles && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border/40 bg-background/60 p-5 backdrop-blur-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground/90 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Tableau comparatif des performances
                  </h3>
                  <button
                    onClick={() => setActiveTab("calendar")}
                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    Voir dans le calendrier ➔
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/40">
                        <th className="pb-2 text-left font-medium text-foreground/50">Métrique</th>
                        <th className="pb-2 text-center font-medium text-sky-500">
                          <span className="flex items-center justify-center gap-1">
                            <Cpu className="h-3 w-3" /> CSP seul
                          </span>
                        </th>
                        <th className="pb-2 text-center font-medium text-emerald-500">
                          <span className="flex items-center justify-center gap-1">
                            <Brain className="h-3 w-3" /> CSP + Règles
                          </span>
                        </th>
                        <th className="pb-2 text-center font-medium text-foreground/50">Différence ($\Delta$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {[
                        {
                          label: "Tâches planifiées",
                          csp: resultCsp.planning.length,
                          regles: resultRegles.planning.length,
                          good: "high",
                        },
                        {
                          label: "Non planifiées",
                          csp: resultCsp.taches_non_planifiees.length,
                          regles: resultRegles.taches_non_planifiees.length,
                          good: "low",
                        },
                        {
                          label: "Avertissements",
                          csp: resultCsp.avertissements.length,
                          regles: resultRegles.avertissements.length,
                          good: "low",
                        },
                        {
                          label: "Décisions d'arbitrage",
                          csp: resultCsp.decisions.length,
                          regles: resultRegles.decisions.length,
                          good: "high",
                        },
                        {
                          label: "Taux de succès",
                          csp: `${Math.round((resultCsp.planning.length / Math.max(currentTasks.length, 1)) * 100)}%`,
                          regles: `${Math.round((resultRegles.planning.length / Math.max(currentTasks.length, 1)) * 100)}%`,
                          good: "high",
                          isPercent: true,
                        },
                      ].map((row) => {
                        const cspNum = typeof row.csp === "string" ? parseInt(row.csp) : row.csp;
                        const reglesNum = typeof row.regles === "string" ? parseInt(row.regles) : row.regles;
                        const diff = reglesNum - cspNum;
                        const isBetter = row.good === "high" ? diff > 0 : diff < 0;
                        const isWorse = row.good === "high" ? diff < 0 : diff > 0;

                        return (
                          <tr key={row.label} className="hover:bg-muted/10 transition-colors">
                            <td className="py-2.5 text-foreground/70 font-medium">{row.label}</td>
                            <td className="py-2.5 text-center font-mono font-medium text-foreground/80">
                              {row.csp}
                            </td>
                            <td className="py-2.5 text-center font-mono font-medium text-foreground/80">
                              {row.regles}
                            </td>
                            <td className="py-2.5 text-center">
                              {diff === 0 ? (
                                <span className="text-foreground/30">—</span>
                              ) : (
                                <span
                                  className={`font-semibold ${
                                    isBetter
                                      ? "text-neutral-400 bg-neutral-500/10 px-2 py-0.5 rounded"
                                      : isWorse
                                      ? "text-neutral-400 bg-neutral-500/10 px-2 py-0.5 rounded"
                                      : "text-foreground/40"
                                  }`}
                                >
                                  {diff > 0 ? "+" : ""}
                                  {row.isPercent ? `${diff}%` : diff}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Tab 3: Visual Calendar */}
        {activeTab === "calendar" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              {/* ── Calendrier principal ── */}
              <div className="rounded-2xl border border-border/40 bg-background/60 p-4 sm:p-5 shadow-sm backdrop-blur-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-foreground/90 flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      Planning généré
                      {activeCalendarResult && (
                        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary font-medium">
                          {activeCalendarResult.planning.length}/{currentTasks.length} créneaux
                        </span>
                      )}
                    </h3>
                  <div className="h-4 w-px bg-border/50 hidden sm:block" />
                  <span className="text-xs text-foreground/50 hidden sm:inline">
                    Mode affiché :{" "}
                    <strong
                      className={
                        calendarMode === "csp_regles"
                          ? "text-emerald-500"
                          : "text-sky-500"
                      }
                    >
                      {calendarMode === "csp_regles" ? "CSP + Règles" : "CSP seul"}
                    </strong>
                  </span>
                </div>

                <SelecteurVue
                  view={view}
                  onViewChange={setView}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                />
              </div>

              {activeCalendarResult ? (
                <CalendrierVue
                  planning={activeCalendarResult.planning}
                  decisions={activeCalendarResult.decisions}
                  view={view}
                  selectedDate={selectedDate}
                  fullTasks={currentTasks}
                  onTaskEdit={handleSaveEditedTask}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/40 bg-muted/10 py-20 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/40 bg-background/60">
                    <CalendarCheck2 className="h-6 w-6 text-foreground/20" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground/60">
                      Aucun planning généré pour ce scénario
                    </p>
                    <p className="text-xs text-foreground/40 mt-1">
                      Lancez la planification pour visualiser l'emploi du temps horaire.
                    </p>
                  </div>
                  <button
                    onClick={() => handleRun()}
                    disabled={isRunning}
                    className="mt-2 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Lancer la planification
                  </button>
                </div>
              )}
              </div>

              {/* ── Panneau latéral : suivi + tâches à placer + légende ── */}
              <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                {/* Suivi de planification */}
                <div className="rounded-2xl border border-border/40 bg-background/60 p-4 shadow-sm backdrop-blur-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                      <Timer className="h-3.5 w-3.5 text-primary" />
                      Suivi de planification
                    </p>
                    {activeCalendarResult && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          succRate >= 100
                            ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                            : succRate >= 60
                            ? "bg-amber-400/15 text-amber-500 border-amber-400/30"
                            : "bg-red-500/15 text-red-500 border-red-500/30"
                        }`}
                      >
                        {succRate}%
                      </span>
                    )}
                  </div>

                  {priorityStats.map((s) => (
                    <div key={s.priorite} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className={`h-2 w-2 rounded-full ${PRIORITE_META[s.priorite].dot}`} />
                          {PRIORITE_META[s.priorite].label}
                        </span>
                        <span className={s.placed === s.total ? "font-semibold text-foreground/70" : "text-foreground/50"}>
                          {s.placed}/{s.total}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
                        <motion.div
                          className={`h-full rounded-full ${PRIORITE_META[s.priorite].bar}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${s.pct}%` }}
                          transition={{ type: "spring", stiffness: 120, damping: 20 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tâches à placer */}
                {activeCalendarResult && activeCalendarResult.taches_non_planifiees.length > 0 && (
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 shadow-sm backdrop-blur-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        À placer manuellement
                      </p>
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                        {activeCalendarResult.taches_non_planifiees.length}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-foreground/50">
                      Ces tâches n&apos;ont pas été planifiées dans le mode « {calendarMode === "csp_regles" ? "CSP + Règles" : "CSP seul"} ». Cliquez sur « Ajuster » pour les placer à la main.
                    </p>
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {activeCalendarResult.taches_non_planifiees.map((t) => (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-amber-500/20 bg-background/70 p-2.5 text-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{t.nom}</p>
                            <p className="font-mono text-[10px] text-foreground/40">{t.id} · {t.duree_min}min</p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ${
                              t.priorite === "urgent"
                                ? "bg-red-500/10 text-red-500 border-red-500/30"
                                : t.priorite === "important"
                                ? "bg-amber-400/10 text-amber-500 border-amber-400/30"
                                : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                            }`}
                          >
                            {t.priorite}
                          </span>
                        </div>
                        <p className="text-[10px] leading-snug text-neutral-400">{t.raison}</p>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setInspectingTask({ task: t as any, reason: t.raison })}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-muted/40 px-2 py-1 text-[10px] font-medium text-foreground/70 transition-colors hover:bg-muted/70"
                          >
                            <Eye className="h-3 w-3" />
                            Raison
                          </button>
                          <button
                            onClick={() => {
                              const orig = currentTasks.find((x) => x.id === t.id);
                              setEditingTask({
                                task: orig || ({
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
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/25"
                          >
                            <Wrench className="h-3 w-3" />
                            Ajuster
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tout planifié */}
                {activeCalendarResult &&
                  activeCalendarResult.taches_non_planifiees.length === 0 && (
                    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 shadow-sm backdrop-blur-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            Toutes les tâches sont planifiées
                          </p>
                          <p className="text-[10px] text-foreground/50">Aucune action manuelle requise</p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Légende */}
                <div className="rounded-2xl border border-border/40 bg-background/60 p-4 shadow-sm backdrop-blur-sm">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                    Légende
                  </p>
                  <div className="flex flex-col gap-2 text-xs text-foreground/60">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm bg-red-500/50" />
                      Urgent
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm bg-amber-400/50" />
                      Important
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm bg-neutral-500/40" />
                      Flexible
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Modals ── */}
      {/* Add Task Modal */}
      <ModalAjoutTache
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTask}
        existingTasks={currentTasks}
        existingPlanning={activeCalendarResult?.planning}
        defaultDate={selectedDate}
      />

      {/* Manual Placement / Edit Task Modal */}
      <ModalPlacementManuel
        isOpen={!!editingTask}
        task={editingTask?.task || null}
        failureReason={editingTask?.reason}
        existingPlanning={activeCalendarResult?.planning}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveEditedTask}
      />

      {/* Decision Reasoning Inspection Modal */}
      <ModalRaisonnementTache
        isOpen={!!inspectingTask}
        task={inspectingTask?.task || null}
        decisionList={activeCalendarResult?.decisions || []}
        planningItem={activeCalendarResult?.planning.find((p) => p.id === inspectingTask?.task.id)}
        failureReason={inspectingTask?.reason}
        onClose={() => setInspectingTask(null)}
        onOpenManualPlacement={(targetTask) => {
          setEditingTask({ task: targetTask });
        }}
        originalTask={currentTasks.find((t) => t.id === inspectingTask?.task.id)}
      />
    </main>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { useState } from "react";
import { Decision, Echec } from "@/lib/api";

interface PanneauDecisionsProps {
  decisions: Decision[];
  avertissements: string[];
  echecs: Echec[];
}

const ETAPE_LABELS: Record<string, string> = {
  placement_csp: "Placement CSP",
  arbitrage_regles: "Arbitrage règles",
};

const RESULTAT_STYLES: Record<string, { icon: React.ReactNode; color: string }> = {
  place: {
    icon: <CheckCircle2 className="h-4 w-4 text-neutral-400" />,
    color: "text-neutral-400",
  },
  decalee: {
    icon: <AlertTriangle className="h-4 w-4 text-neutral-400" />,
    color: "text-neutral-400",
  },
  non_resolu: {
    icon: <XCircle className="h-4 w-4 text-neutral-400" />,
    color: "text-neutral-400",
  },
};

function AccordionItem({ title, icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-foreground/40" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PanneauDecisions({ decisions, avertissements, echecs }: PanneauDecisionsProps) {
  const placed = decisions.filter((d) => d.resultat === "place");
  const arbitrages = decisions.filter((d) => d.etape === "arbitrage_regles");

  if (decisions.length === 0 && avertissements.length === 0 && echecs.length === 0) {
    return (
      <div className="rounded-xl border border-border/40 bg-muted/20 p-6 text-center text-sm text-foreground/40">
        Aucune décision à afficher. Lancez une planification pour voir les résultats ici.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Placements CSP */}
      {placed.length > 0 && (
        <AccordionItem
          title={`Placements CSP (${placed.length})`}
          icon={<CheckCircle2 className="h-4 w-4 text-neutral-400" />}
          defaultOpen={false}
        >
          {placed.map((d, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-start gap-2 rounded-lg bg-neutral-500/5 border border-neutral-500/20 px-3 py-2 text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-neutral-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground/80">
                  <span className="font-mono text-neutral-400">{d.tache_id}</span>
                  {d.creneau && <span className="text-foreground/40 ml-1">· {d.date} {d.creneau}</span>}
                </p>
                <p className="text-foreground/50 mt-0.5">{d.raison}</p>
              </div>
            </motion.div>
          ))}
        </AccordionItem>
      )}

      {/* Arbitrages */}
      {arbitrages.length > 0 && (
        <AccordionItem
          title={`Arbitrages règles (${arbitrages.length})`}
          icon={<AlertTriangle className="h-4 w-4 text-neutral-400" />}
          defaultOpen={true}
        >
          {arbitrages.map((d, i) => {
            const style = RESULTAT_STYLES[d.resultat] ?? RESULTAT_STYLES["non_resolu"];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5 text-xs space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  {style.icon}
                  <span className="font-medium text-foreground/80">
                    <span className="font-mono">{d.tache_id}</span>
                    <span className={`ml-2 capitalize font-semibold ${style.color}`}>{d.resultat.replace("_", " ")}</span>
                  </span>
                  <span className="ml-auto text-[10px] text-foreground/30 uppercase tracking-wider">
                    {ETAPE_LABELS[d.etape] ?? d.etape}
                  </span>
                </div>
                <p className="text-foreground/60 leading-relaxed">{d.raison}</p>
              </motion.div>
            );
          })}
        </AccordionItem>
      )}

      {/* Avertissements */}
      {avertissements.length > 0 && (
        <AccordionItem
          title={`Avertissements (${avertissements.length})`}
          icon={<Info className="h-4 w-4 text-neutral-400" />}
          defaultOpen={false}
        >
          {avertissements.map((a, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg bg-neutral-500/5 border border-neutral-500/20 px-3 py-2 text-xs text-foreground/60"
            >
              <Info className="h-3.5 w-3.5 text-neutral-400 mt-0.5 shrink-0" />
              <span>{a}</span>
            </div>
          ))}
        </AccordionItem>
      )}

      {/* Échecs */}
      {echecs.length > 0 && (
        <AccordionItem
          title={`Échecs (${echecs.length})`}
          icon={<XCircle className="h-4 w-4 text-neutral-400" />}
          defaultOpen={true}
        >
          {echecs.map((e, i) => (
            <div
              key={i}
              className="rounded-lg bg-neutral-500/10 border border-neutral-500/50 px-3 py-2.5 text-xs space-y-1 shadow-sm shadow-neutral-500/10"
            >
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-neutral-500 shrink-0" />
                <span className="font-mono text-neutral-500 font-bold">{e.taches.join(", ")}</span>
              </div>
              <p className="text-foreground/60">{e.raison}</p>
            </div>
          ))}
        </AccordionItem>
      )}
    </div>
  );
}

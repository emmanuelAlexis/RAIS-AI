"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

export type ViewMode = "jour" | "semaine" | "mois";

interface SelecteurVueProps {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
}

const VIEWS: { key: ViewMode; label: string }[] = [
  { key: "jour", label: "Jour" },
  { key: "semaine", label: "Semaine" },
  { key: "mois", label: "Mois" },
];

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function formatDisplayDate(dateStr: string, view: ViewMode): string {
  const d = new Date(dateStr + "T00:00:00");
  if (view === "jour") {
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  if (view === "semaine") {
    const start = new Date(d);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(d.getDate() + diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    return `${start.toLocaleDateString("fr-FR", opts)} – ${end.toLocaleDateString("fr-FR", opts)} ${end.getFullYear()}`;
  }
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function navigate(dateStr: string, view: ViewMode, dir: 1 | -1): string {
  if (view === "jour") return addDays(dateStr, dir);
  if (view === "semaine") return addDays(dateStr, dir * 7);
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + dir);
  return d.toISOString().split("T")[0];
}

export default function SelecteurVue({ view, onViewChange, selectedDate, onDateChange }: SelecteurVueProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerInput, setPickerInput] = useState(selectedDate);

  const handleNav = (dir: 1 | -1) => {
    onDateChange(navigate(selectedDate, view, dir));
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* View toggle */}
      <div className="inline-flex items-center gap-0.5 rounded-xl border border-border/50 bg-muted/30 p-1">
        {VIEWS.map(({ key, label }) => (
          <motion.button
            key={key}
            id={`view-btn-${key}`}
            onClick={() => onViewChange(key)}
            className={`relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === key ? "text-primary-foreground" : "text-foreground/60 hover:text-foreground/90"
            }`}
            whileTap={{ scale: 0.97 }}
          >
            {view === key && (
              <motion.span
                layoutId="view-indicator"
                className="absolute inset-0 rounded-lg bg-primary"
                style={{ zIndex: -1 }}
                transition={{ type: "spring", stiffness: 380, damping: 35 }}
              />
            )}
            {label}
          </motion.button>
        ))}
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-1">
        <button
          id="nav-prev"
          onClick={() => handleNav(-1)}
          className="rounded-lg p-1.5 text-foreground/50 hover:bg-muted/60 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          id="date-display-btn"
          onClick={() => setShowPicker((p) => !p)}
          className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/60 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:bg-muted/40 transition-colors min-w-[200px] justify-center"
        >
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="capitalize">{formatDisplayDate(selectedDate, view)}</span>
        </button>
        <button
          id="nav-next"
          onClick={() => handleNav(1)}
          className="rounded-lg p-1.5 text-foreground/50 hover:bg-muted/60 hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Date picker popover */}
      {showPicker && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute z-50 mt-2 rounded-xl border border-border/60 bg-background shadow-xl p-4"
          style={{ top: "100%", left: 0 }}
        >
          <label className="block text-xs text-foreground/50 mb-1.5">Choisir une date</label>
          <input
            type="date"
            id="date-picker-input"
            value={pickerInput}
            onChange={(e) => setPickerInput(e.target.value)}
            className="rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex gap-2 mt-3">
            <button
              id="date-picker-apply"
              onClick={() => { onDateChange(pickerInput); setShowPicker(false); }}
              className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Appliquer
            </button>
            <button
              id="date-picker-cancel"
              onClick={() => setShowPicker(false)}
              className="rounded-lg border border-border/60 px-3 py-1.5 text-xs text-foreground/60 hover:bg-muted/40 transition-colors"
            >
              Annuler
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

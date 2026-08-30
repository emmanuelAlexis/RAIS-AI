"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { importerFichier, Tache } from "@/lib/api";

interface ImportTachesProps {
  existingTaches: Tache[];
  onImport: (merged: Tache[]) => void;
}

export default function ImportTaches({ existingTaches, onImport }: ImportTachesProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastImported, setLastImported] = useState<Tache[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    setFileName(file.name);
    try {
      const newTaches = await importerFichier(file);
      // Merge: keep existing, override/add new by id
      const existingMap = new Map(existingTaches.map(t => [t.id, t]));
      newTaches.forEach(t => existingMap.set(t.id, t));
      const merged = Array.from(existingMap.values());
      setLastImported(newTaches);
      onImport(merged);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const prioriteColors: Record<string, string> = {
    urgent: "bg-red-500/10 text-red-500 border-red-500/30",
    important: "bg-amber-400/10 text-amber-500 border-amber-400/30",
    flexible: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        animate={{ scale: dragging ? 1.02 : 1 }}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border/60 bg-background/50 hover:border-primary/50 hover:bg-primary/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".json,.csv,.xlsx,.xls"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          id="file-upload-input"
        />
        <div className="flex flex-col items-center gap-3">
          {loading ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : lastImported ? (
            <CheckCircle2 className="h-10 w-10 text-neutral-400" />
          ) : (
            <Upload className="h-10 w-10 text-foreground/30" />
          )}
          <div>
            <p className="font-medium text-sm text-foreground/80">
              {loading
                ? "Import en cours…"
                : lastImported
                ? `+${lastImported.length} tâche(s) ajoutée(s) depuis ${fileName} · Total : ${existingTaches.length}`
                : "Déposez votre fichier ici ou cliquez pour parcourir"}
            </p>
            <p className="text-xs text-foreground/40 mt-1">
              {lastImported
                ? "Réimportez un fichier pour en ajouter d'autres."
                : "Formats acceptés : JSON, CSV, XLSX, XLS"}
            </p>
          </div>
        </div>
        {/* Format badges — shown when nothing imported yet */}
        {!lastImported && !loading && (
          <div className="mt-4 flex justify-center gap-2">
            {([["JSON", FileJson, "text-neutral-400"], ["CSV", FileSpreadsheet, "text-neutral-400"], ["XLSX", FileSpreadsheet, "text-neutral-400"]] as [string, React.ElementType, string][]).map(
              ([label, IconComp, color]) => (
                <span
                  key={label}
                  className={`inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/60 px-2.5 py-0.5 text-[10px] font-medium ${color}`}
                >
                  <IconComp className="h-3 w-3" />
                  {label}
                </span>
              )
            )}
          </div>
        )}
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2 rounded-xl border border-neutral-500/30 bg-neutral-500/10 p-3 text-sm text-neutral-400"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview table — shows only the last imported batch */}
      <AnimatePresence>
        {lastImported && lastImported.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-border/50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/50">
              <span className="text-xs font-medium text-foreground/50 uppercase tracking-wider">Dernier import — {lastImported.length} tâche(s)</span>
              <button
                onClick={() => { setLastImported(null); setFileName(null); onImport(existingTaches.filter(t => !lastImported.find(l => l.id === t.id))); }}
                className="text-foreground/30 hover:text-neutral-400 transition-colors"
                title="Annuler ce dernier import"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    {["ID", "Nom", "Date", "Durée", "Horaire fixe", "Priorité", "Dépendances"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-foreground/50 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lastImported.map((t: Tache, i: number) => (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-3 py-2 font-mono text-foreground/60">{t.id}</td>
                      <td className="px-3 py-2 font-medium text-foreground/90">{t.nom}</td>
                      <td className="px-3 py-2 text-foreground/60">{t.date}</td>
                      <td className="px-3 py-2 text-foreground/60">{t.duree_min} min</td>
                      <td className="px-3 py-2 text-foreground/60">{t.horaire_fixe || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${prioriteColors[t.priorite]}`}>
                          {t.priorite}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-foreground/50">
                        {t.dependances.length > 0 ? t.dependances.join(", ") : "—"}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

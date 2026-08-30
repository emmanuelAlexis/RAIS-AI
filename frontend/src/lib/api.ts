const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Tache {
  id: string;
  nom: string;
  date: string;
  duree_min: number;
  horaire_fixe: string | null;
  plage_disponibilite: [string, string][] | null;
  priorite: "urgent" | "important" | "flexible";
  dependances: string[];
}

export interface PlanningItem {
  id: string;
  nom: string;
  date: string;
  debut: string;
  fin: string;
  priorite: "urgent" | "important" | "flexible";
}

export interface Decision {
  etape: string;
  tache_id: string;
  resultat: string;
  date: string;
  creneau: string;
  raison: string;
}

export interface Echec {
  taches: string[];
  raison: string;
}

export interface TacheNonPlanifiee {
  id: string;
  nom: string;
  date: string;
  duree_min: number;
  horaire_fixe: string | null;
  priorite: "urgent" | "important" | "flexible";
  raison: string;
}

export interface PlanningResult {
  planning: PlanningItem[];
  decisions: Decision[];
  avertissements: string[];
  echecs: Echec[];
  taches_non_planifiees: TacheNonPlanifiee[];
}

export async function importerFichier(file: File): Promise<Tache[]> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/importer`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || "Erreur lors de l'import du fichier");
  }

  return response.json();
}

export async function planifier(
  taches: Tache[],
  mode: "csp_seul" | "csp_regles",
  dateDebut: string,
  dateFin: string,
  existingPlanning: PlanningItem[] = []
): Promise<PlanningResult> {
  const response = await fetch(`${API_BASE}/api/planifier`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taches,
      mode,
      date_debut: dateDebut,
      date_fin: dateFin,
      planning_existant: existingPlanning.map(p => ({
        id: p.id,
        date: p.date,
        debut: p.debut,
        fin: p.fin,
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || "Erreur lors de la planification");
  }

  return response.json();
}

export async function sauvegarderEtat(taches: Tache[], resultat: PlanningResult): Promise<void> {
  const response = await fetch(`${API_BASE}/api/sauvegarder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taches, resultat }),
  });
  if (!response.ok) {
    throw new Error("Erreur lors de la sauvegarde de l'état");
  }
}

export async function chargerEtat(): Promise<{ taches: Tache[]; resultat: PlanningResult | null }> {
  const response = await fetch(`${API_BASE}/api/etat`, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error("Erreur lors du chargement de l'état");
  }
  return response.json();
}

from typing import List, Literal, Dict, Tuple, Optional
from datetime import datetime
import math

from .modele import Tache, HEURE_DEBUT, HEURE_FIN, PAUSE_MIN, PRIORITES_BAREME
from .csp_solver import resoudre_csp, _minutes_to_time, _time_to_minutes
from .moteur_regles import arbitrer


def planifier(
    taches: List[Tache],
    mode: Literal["csp_seul", "csp_regles"],
    date_debut: str,
    date_fin: str,
    planning_existant: List[Dict] = None
) -> Dict:
    """
    Orchestre la planification des tâches pour une plage de dates donnée.
    planning_existant: liste de créneaux déjà occupés (id, date, debut, fin)
                       traités comme des contraintes fixes immuables.
    """
    planning_final = []
    decisions = []
    avertissements = []
    echecs = []
    taches_non_planifiees = []

    # 1. Filter tasks in [date_debut, date_fin] and detect missing duree_min
    d_debut = datetime.strptime(date_debut, "%Y-%m-%d")
    d_fin = datetime.strptime(date_fin, "%Y-%m-%d")

    taches_filtrees = []
    for t in taches:
        t_date = datetime.strptime(t.date, "%Y-%m-%d")
        if d_debut <= t_date <= d_fin:
            # The Tache model defaults duree_min to 30 — we detect if it was missing (default value)
            # by checking a special sentinel: if the original data had no duree_min we can't tell
            # after pydantic parsing. The avertissements on duree_par_defaut must be handled at import time
            # But the orchestrator can still check the spec sentinel flag if needed.
            taches_filtrees.append(t)

    if not taches_filtrees:
        return {
            "planning": [],
            "decisions": [],
            "avertissements": ["Aucune tâche dans la plage de dates spécifiée."],
            "echecs": [],
            "taches_non_planifiees": []
        }

    # 2. Group by date
    par_date: Dict[str, List[Tache]] = {}
    for t in taches_filtrees:
        par_date.setdefault(t.date, []).append(t)

    # Sort each day by priority (desc) so CSP tries to place higher prio first
    for date_key in par_date:
        par_date[date_key].sort(key=lambda t: PRIORITES_BAREME[t.priorite], reverse=True)

    # 3. Process day by day
    # plannings_precedents accumulates placed tasks from previous days for cross-day dependency checks
    # We also seed it with existing planning items (immovable occupied slots)
    plannings_precedents: Dict[str, Tuple[str, str, str]] = {}

    # Pre-populate with already-existing planning items so the CSP avoids their slots
    if planning_existant:
        for item in planning_existant:
            plannings_precedents[item["id"]] = (item["date"], item["debut"], item["fin"])

    for date_str in sorted(par_date.keys()):
        taches_jour = par_date[date_str]
        
        if mode == "csp_seul":
            solution, log_echecs = resoudre_csp(taches_jour, plannings_precedents)
            
            if solution:
                for t_id, (d, debut, fin) in solution.items():
                    tache = next(t for t in taches_jour if t.id == t_id)
                    planning_final.append({
                        "id": t_id,
                        "nom": tache.nom,
                        "date": d,
                        "debut": debut,
                        "fin": fin,
                        "priorite": tache.priorite
                    })
                    decisions.append({
                        "etape": "placement_csp",
                        "tache_id": t_id,
                        "resultat": "place",
                        "date": d,
                        "creneau": f"{debut}-{fin}",
                        "raison": f"Créneau trouvé par le solveur CSP pour '{tache.nom}'."
                    })
                    plannings_precedents[t_id] = (d, debut, fin)
            else:
                for e in log_echecs:
                    echecs.append({
                        "taches": e.get("taches", []),
                        "raison": e.get("raison", "Échec du CSP")
                    })
                for t in taches_jour:
                    taches_non_planifiees.append({
                        "id": t.id,
                        "nom": t.nom,
                        "date": t.date,
                        "duree_min": t.duree_min,
                        "horaire_fixe": t.horaire_fixe,
                        "priorite": t.priorite,
                        "raison": "Échec du CSP"
                    })

        elif mode == "csp_regles":
            remaining = list(taches_jour)
            
            while remaining:
                solution, log_echecs = resoudre_csp(remaining, plannings_precedents)
                
                if solution:
                    for t_id, (d, debut, fin) in solution.items():
                        tache = next(t for t in remaining if t.id == t_id)
                        planning_final.append({
                            "id": t_id,
                            "nom": tache.nom,
                            "date": d,
                            "debut": debut,
                            "fin": fin,
                            "priorite": tache.priorite
                        })
                        decisions.append({
                            "etape": "placement_csp",
                            "tache_id": t_id,
                            "resultat": "place",
                            "date": d,
                            "creneau": f"{debut}-{fin}",
                            "raison": f"Créneau trouvé par le solveur CSP pour '{tache.nom}'."
                        })
                        plannings_precedents[t_id] = (d, debut, fin)
                    break
                else:
                    # Try to resolve conflict with rules engine
                    if len(remaining) < 2:
                        for e in log_echecs:
                            echecs.append({
                                "taches": e.get("taches", remaining),
                                "raison": e.get("raison", "Échec du CSP sans tâche à arbitrer.")
                            })
                        for t in remaining:
                            taches_non_planifiees.append({
                                "id": t.id, "nom": t.nom, "date": t.date,
                                "duree_min": t.duree_min, "horaire_fixe": t.horaire_fixe,
                                "priorite": t.priorite, "raison": "Échec du CSP sans tâche à arbitrer."
                            })
                        break

                    # Find conflicting tasks — prefer info from log_echecs
                    # log_echecs may come from: fixed-task conflict (has 'taches' with 2 ids)
                    # or flex-task overflow (has 'taches' with 1 id)
                    conflict_ids = []
                    for e in log_echecs:
                        conflict_ids.extend(e.get("taches", []))
                    conflict_ids = list(dict.fromkeys(conflict_ids))  # deduplicate, preserve order
                    if not conflict_ids:
                        conflict_ids = [t.id for t in remaining]
                    conflict_taches = [t for t in remaining if t.id in conflict_ids]
                    
                    if len(conflict_taches) == 0:
                        # No identifiable conflict task — mark all as failed
                        for e in log_echecs:
                            echecs.append({"taches": [t.id for t in remaining], "raison": e.get("raison", "Conflit non résolvable.")})
                        for t in remaining:
                            taches_non_planifiees.append({
                                "id": t.id, "nom": t.nom, "date": t.date,
                                "duree_min": t.duree_min, "horaire_fixe": t.horaire_fixe,
                                "priorite": t.priorite, "raison": "Impossible de planifier."
                            })
                        break

                    if len(conflict_taches) == 1:
                        # A single flex task couldn't be placed (no free slot) — remove it and retry
                        tache_a_retirer = conflict_taches[0]
                        raison = log_echecs[0].get("raison", f"Aucun créneau disponible pour '{tache_a_retirer.nom}'.") if log_echecs else f"Aucun créneau disponible pour '{tache_a_retirer.nom}'."
                        remaining.remove(tache_a_retirer)
                        decisions.append({
                            "etape": "arbitrage_regles",
                            "tache_id": tache_a_retirer.id,
                            "resultat": "non_planifiable",
                            "date": date_str,
                            "creneau": "",
                            "raison": raison
                        })
                        avertissements.append(f"Tâche '{tache_a_retirer.nom}' non planifiable : {raison}")
                        taches_non_planifiees.append({
                            "id": tache_a_retirer.id, "nom": tache_a_retirer.nom, "date": tache_a_retirer.date,
                            "duree_min": tache_a_retirer.duree_min, "horaire_fixe": tache_a_retirer.horaire_fixe,
                            "priorite": tache_a_retirer.priorite, "raison": raison
                        })
                        continue

                    # Sort by priority asc to find the weakest pair
                    conflict_taches.sort(key=lambda t: PRIORITES_BAREME[t.priorite])
                    ta, tb = conflict_taches[0], conflict_taches[1]
                    
                    arbitrage = arbitrer((ta, tb))
                    
                    if arbitrage["resolu"]:
                        tache_a_retirer_id = arbitrage["tache_a_decaler"]
                        tache_a_retirer = next(t for t in remaining if t.id == tache_a_retirer_id)
                        remaining.remove(tache_a_retirer)
                        
                        decisions.append({
                            "etape": "arbitrage_regles",
                            "tache_id": tache_a_retirer_id,
                            "resultat": "decalee",
                            "date": date_str,
                            "creneau": "",
                            "raison": arbitrage["raison"]
                        })
                        avertissements.append(
                            f"Tâche '{tache_a_retirer.nom}' ({tache_a_retirer_id}) décalée: {arbitrage['raison']}"
                        )
                        taches_non_planifiees.append({
                            "id": tache_a_retirer.id, "nom": tache_a_retirer.nom, "date": tache_a_retirer.date,
                            "duree_min": tache_a_retirer.duree_min, "horaire_fixe": tache_a_retirer.horaire_fixe,
                            "priorite": tache_a_retirer.priorite, "raison": arbitrage["raison"]
                        })
                    else:
                        # Cannot resolve — escalate as failure
                        echecs.append({
                            "taches": [ta.id, tb.id],
                            "raison": arbitrage["raison"]
                        })
                        decisions.append({
                            "etape": "arbitrage_regles",
                            "tache_id": f"{ta.id},{tb.id}",
                            "resultat": "non_resolu",
                            "date": date_str,
                            "creneau": "",
                            "raison": arbitrage["raison"]
                        })
                        # Remove one to try to continue (remove by lower id lexicographically)
                        remaining.remove(ta)
                        taches_non_planifiees.append({
                            "id": ta.id, "nom": ta.nom, "date": ta.date,
                            "duree_min": ta.duree_min, "horaire_fixe": ta.horaire_fixe,
                            "priorite": ta.priorite, "raison": arbitrage["raison"]
                        })

    return {
        "planning": planning_final,
        "decisions": decisions,
        "avertissements": avertissements,
        "echecs": echecs,
        "taches_non_planifiees": taches_non_planifiees
    }

"""
csp_solver.py — Planificateur de tâches par date.

Stratégie hybride:
  - Tâches avec `horaire_fixe`: vérification directe + détection de conflits.
  - Tâches sans `horaire_fixe`: placement glouton trié par priorité décroissante.
  - Dépendances intra-jour traitées via tri topologique.
  - Dépendances inter-jours vérifiées contre `plannings_precedents`.
"""
from typing import List, Dict, Tuple, Optional
from datetime import datetime
import math

from .modele import Tache, HEURE_DEBUT, HEURE_FIN, PAUSE_MIN, PRIORITES_BAREME


def _time_to_minutes(t: str) -> int:
    h, m = map(int, t.split(':'))
    return h * 60 + m


def _minutes_to_time(m: int) -> str:
    h = m // 60
    mn = m % 60
    return f"{h:02d}:{mn:02d}"


def _duree_reelle(tache: Tache) -> int:
    """Durée arrondie au multiple de 15 min supérieur."""
    return math.ceil(tache.duree_min / 15) * 15


def _topo_sort(taches: List[Tache]) -> List[Tache]:
    """Tri topologique des tâches par dépendances intra-jour."""
    ids = {t.id for t in taches}
    tache_dict = {t.id: t for t in taches}
    visited, result = set(), []

    def visit(t: Tache):
        if t.id in visited:
            return
        visited.add(t.id)
        for dep_id in t.dependances:
            if dep_id in ids:
                visit(tache_dict[dep_id])
        result.append(t)

    for t in taches:
        visit(t)
    return result


def resoudre_csp(
    taches: List[Tache],
    plannings_precedents: Dict[str, Tuple[str, str, str]] = None
) -> Tuple[Optional[Dict[str, Tuple[str, str, str]]], List[dict]]:
    """
    Planifie une liste de tâches (même date) par algorithme glouton hybride.

    Returns:
        (planning, log_echecs) where planning maps tache_id -> (date, debut, fin)
    """
    if not taches:
        return {}, []

    if plannings_precedents is None:
        plannings_precedents = {}

    log_echecs = []
    date_str = taches[0].date
    for t in taches:
        if t.date != date_str:
            raise ValueError("Le solver doit recevoir des tâches d'une même date.")

    debut_min = _time_to_minutes(HEURE_DEBUT)
    fin_min = _time_to_minutes(HEURE_FIN)

    planning: Dict[str, Tuple[str, str, str]] = {}
    # Tracks occupied intervals as list of (start, end)
    occupied: List[Tuple[int, int]] = []

    # Pre-block time slots already occupied by existing planning items on this day
    for existing_id, (ex_date, ex_debut, ex_fin) in plannings_precedents.items():
        if ex_date == date_str:
            occupied.append((_time_to_minutes(ex_debut), _time_to_minutes(ex_fin)))

    def is_slot_free(start: int, end: int) -> bool:
        for (s, e) in occupied:
            if not (end + PAUSE_MIN <= s or e + PAUSE_MIN <= start):
                return False
        return True

    def find_earliest_slot(duree: int, not_before: int = debut_min) -> Optional[int]:
        """Find earliest 15-min aligned free slot of given duration."""
        step = 15
        start = not_before
        while start + duree <= fin_min:
            if is_slot_free(start, start + duree):
                return start
            start += step
        return None

    def cross_day_min_start(tache: Tache) -> int:
        """Compute earliest start due to cross-day dependencies."""
        min_start = debut_min
        for dep_id in tache.dependances:
            if dep_id in plannings_precedents:
                prev_date, _, prev_fin = plannings_precedents[dep_id]
                prev_dt = datetime.strptime(f"{prev_date} {prev_fin}", "%Y-%m-%d %H:%M")
                cur_dt = datetime.strptime(f"{date_str} {HEURE_DEBUT}", "%Y-%m-%d %H:%M")
                if prev_dt.date() < datetime.strptime(date_str, "%Y-%m-%d").date():
                    # Cross-day dep: ok as long as prev ended before today's start
                    pass  # no additional constraint on same-day start
                elif prev_dt.date() == datetime.strptime(date_str, "%Y-%m-%d").date():
                    dep_fin_min = _time_to_minutes(prev_fin)
                    min_start = max(min_start, dep_fin_min)
        return min_start

    # ── Step 1: Validate and place fixed-time tasks first ────────────────────
    fixed_taches = [t for t in taches if t.horaire_fixe]
    flex_taches = [t for t in taches if not t.horaire_fixe]

    # Check fixed tasks for out-of-range
    for t in fixed_taches:
        start = _time_to_minutes(t.horaire_fixe)
        duree = _duree_reelle(t)
        if start < debut_min or start + duree > fin_min:
            log_echecs.append({
                "tache_id": t.id,
                "creneau_teste": t.horaire_fixe,
                "contrainte_violee": f"horaire_fixe {t.horaire_fixe} hors plage {HEURE_DEBUT}–{HEURE_FIN} ou déborde"
            })
            return None, log_echecs

    # Check fixed tasks conflict among themselves
    fixed_sorted = sorted(fixed_taches, key=lambda t: _time_to_minutes(t.horaire_fixe))
    for i, ta in enumerate(fixed_sorted):
        sa = _time_to_minutes(ta.horaire_fixe)
        ea = sa + _duree_reelle(ta)
        for tb in fixed_sorted[i + 1:]:
            sb = _time_to_minutes(tb.horaire_fixe)
            eb = sb + _duree_reelle(tb)
            if not (ea + PAUSE_MIN <= sb or eb + PAUSE_MIN <= sa):
                log_echecs.append({
                    "taches": [ta.id, tb.id],
                    "raison": f"Conflit horaire fixe: '{ta.nom}' ({ta.horaire_fixe}) et '{tb.nom}' ({tb.horaire_fixe}) se chevauchent."
                })
                return None, log_echecs

    # Place fixed tasks
    for t in fixed_sorted:
        start = _time_to_minutes(t.horaire_fixe)
        duree = _duree_reelle(t)
        end = start + duree
        occupied.append((start, end))
        planning[t.id] = (date_str, _minutes_to_time(start), _minutes_to_time(end))

    # ── Step 2: Greedy placement for flexible tasks (topo-sorted by deps) ────
    # Sort flex tasks: dependencies first, then by priority desc
    try:
        flex_sorted = _topo_sort(flex_taches)
    except RecursionError:
        flex_sorted = flex_taches

    # Within same dependency level, sort by priority desc
    # Re-sort: keep topo order but within independent tasks sort by priority
    flex_sorted.sort(key=lambda t: PRIORITES_BAREME[t.priorite], reverse=True)
    flex_sorted = _topo_sort(flex_sorted)

    failed_flex: List[Tache] = []

    for t in flex_sorted:
        duree = _duree_reelle(t)
        not_before = debut_min

        # Respect intra-day dependencies already placed
        for dep_id in t.dependances:
            if dep_id in planning:
                _, _, dep_fin = planning[dep_id]
                not_before = max(not_before, _time_to_minutes(dep_fin))

        # Respect cross-day dependencies
        not_before = max(not_before, cross_day_min_start(t))

        slot = find_earliest_slot(duree, not_before)
        if slot is None:
            log_echecs.append({
                "taches": [t.id],
                "tache_id": t.id,
                "creneau_teste": f"à partir de {_minutes_to_time(not_before)}",
                "raison": f"Aucun créneau libre de {duree} min pour '{t.nom}' après {_minutes_to_time(not_before)}",
                "contrainte_violee": f"Aucun créneau libre de {duree} min pour '{t.nom}' après {_minutes_to_time(not_before)}"
            })
            failed_flex.append(t)
            continue

        end = slot + duree
        occupied.append((slot, end))
        planning[t.id] = (date_str, _minutes_to_time(slot), _minutes_to_time(end))

    # If ALL tasks failed (nothing placed at all) → return None to trigger arbitrage
    if not planning and taches:
        return None, log_echecs

    # If some flex tasks couldn't be placed, return None so orchestrateur triggers rules engine
    if failed_flex:
        return None, log_echecs

    # Full success
    return planning, log_echecs

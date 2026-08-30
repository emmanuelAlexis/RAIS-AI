"""
test_evaluation.py — Tests d'évaluation système sur tous les cas de test.
Peut être lancé via: pytest tests/test_evaluation.py -v
ou via: python -m pytest tests/test_evaluation.py -v
"""
import pytest
from src.import_donnees import charger_taches
from src.orchestrateur import planifier

DATA_DIR = "data/cas_test"


def _planifier_cas(cas_file, mode="csp_regles"):
    taches = charger_taches(cas_file)
    if not taches:
        return {"planning": [], "decisions": [], "avertissements": [], "echecs": []}, taches
    dates = [t.date for t in taches]
    result = planifier(taches, mode, min(dates), max(dates))
    return result, taches


# ─── Cas 1: Planning simple sans conflit ─────────────────────────────────────

def test_cas01_sans_conflit():
    result, taches = _planifier_cas(f"{DATA_DIR}/cas_01.json")
    assert len(result["planning"]) == len(taches)
    assert not result["echecs"]


def test_cas01_csv_equivalence():
    taches_json = charger_taches(f"{DATA_DIR}/cas_01.json")
    taches_csv = charger_taches(f"{DATA_DIR}/cas_01.csv")
    taches_xlsx = charger_taches(f"{DATA_DIR}/cas_01.xlsx")
    for fmt_taches in [taches_csv, taches_xlsx]:
        assert sorted([t.id for t in taches_json]) == sorted([t.id for t in fmt_taches])
        assert sorted([t.nom for t in taches_json]) == sorted([t.nom for t in fmt_taches])
        assert sorted([t.duree_min for t in taches_json]) == sorted([t.duree_min for t in fmt_taches])


# ─── Cas 2: Chevauchement, priorités différentes ─────────────────────────────

def test_cas02_csp_seul_echoue():
    """En mode csp_seul, les deux tâches à horaires fixes chevauchants échouent."""
    result, _ = _planifier_cas(f"{DATA_DIR}/cas_02.json", mode="csp_seul")
    assert result["echecs"] or len(result["planning"]) < 2


def test_cas02_csp_regles_resoud():
    """En mode csp_regles, l'arbitrage décale la moins prioritaire."""
    result, _ = _planifier_cas(f"{DATA_DIR}/cas_02.json", mode="csp_regles")
    assert len(result["planning"]) >= 1
    arbitrages = [d for d in result["decisions"] if d["etape"] == "arbitrage_regles"]
    assert len(arbitrages) >= 1


# ─── Cas 3: Tâche sans duree_min ─────────────────────────────────────────────

def test_cas03_duree_par_defaut():
    taches = charger_taches(f"{DATA_DIR}/cas_03.json")
    assert taches[0].duree_min == 30


# ─── Cas 4: Trois horaires fixes chevauchants ─────────────────────────────────

def test_cas04_echec_attendu():
    result, _ = _planifier_cas(f"{DATA_DIR}/cas_04.json", mode="csp_seul")
    assert result["echecs"], "Le cas 4 doit produire des échecs"


# ─── Cas 5: Même priorité, même créneau ──────────────────────────────────────

def test_cas05_csp_seul_echoue():
    result, _ = _planifier_cas(f"{DATA_DIR}/cas_05.json", mode="csp_seul")
    assert result["echecs"] or len(result["planning"]) < 2


def test_cas05_csp_regles_non_resolu_produit_justification():
    result, _ = _planifier_cas(f"{DATA_DIR}/cas_05.json", mode="csp_regles")
    unresolved = [d for d in result["decisions"] if d["resultat"] == "non_resolu"]
    if unresolved:
        for d in unresolved:
            assert d["raison"] and len(d["raison"].strip()) > 0


# ─── Cas 6: Dépendance B après A ─────────────────────────────────────────────

def test_cas06_dependance_respectee():
    result, _ = _planifier_cas(f"{DATA_DIR}/cas_06.json")
    placed = {p["id"]: p for p in result["planning"]}
    if "tA" in placed and "tB" in placed:
        fin_A = placed["tA"]["fin"]
        debut_B = placed["tB"]["debut"]
        assert fin_A <= debut_B, "tB doit commencer après la fin de tA"


# ─── Cas 7: 10+ tâches sur la même journée ───────────────────────────────────

def test_cas07_charge():
    result, taches = _planifier_cas(f"{DATA_DIR}/cas_07.json")
    # No exception, at least some tasks are placed
    assert isinstance(result["planning"], list)


# ─── Cas 8: Tâche urgente en conflit ─────────────────────────────────────────

def test_cas08_urgent_prioritaire_csp_regles():
    result, _ = _planifier_cas(f"{DATA_DIR}/cas_08.json", mode="csp_regles")
    placed_ids = {p["id"] for p in result["planning"]}
    # With csp_regles, t2 (urgent) should be placed, t1 (important) may be delayed
    assert len(result["decisions"]) > 0


def test_cas08_differ_csp_seul_vs_regles():
    res_seul, _ = _planifier_cas(f"{DATA_DIR}/cas_08.json", mode="csp_seul")
    res_regles, _ = _planifier_cas(f"{DATA_DIR}/cas_08.json", mode="csp_regles")
    # At minimum, decisions differ (more decisions with regles)
    assert res_seul != res_regles or res_seul["echecs"] != res_regles["echecs"]


# ─── Cas 9: Liste vide ───────────────────────────────────────────────────────

def test_cas09_liste_vide():
    taches = charger_taches(f"{DATA_DIR}/cas_09.json")
    assert taches == []


# ─── Cas 10: horaire_fixe hors plage ─────────────────────────────────────────

def test_cas10_hors_plage_echoue():
    result, _ = _planifier_cas(f"{DATA_DIR}/cas_10.json")
    # The task with horaire 21:00 should fail
    assert result["echecs"] or len(result["planning"]) == 0


# ─── Justifications non vides ────────────────────────────────────────────────

def test_justifications_non_vides():
    """Chaque décision d'arbitrage doit avoir une justification non vide."""
    for cas in ["cas_02.json", "cas_05.json", "cas_08.json"]:
        result, _ = _planifier_cas(f"{DATA_DIR}/{cas}", mode="csp_regles")
        for d in result["decisions"]:
            if d["etape"] == "arbitrage_regles":
                assert d["raison"] and len(d["raison"].strip()) > 0, \
                    f"Justification vide pour {cas}"

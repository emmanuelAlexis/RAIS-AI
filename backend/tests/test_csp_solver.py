from src.modele import Tache
from src.csp_solver import resoudre_csp, _time_to_minutes


def make_tache(**kwargs):
    defaults = {
        "id": "t1", "nom": "Test", "date": "2026-09-01",
        "duree_min": 30, "horaire_fixe": None, "priorite": "flexible",
        "dependances": []
    }
    defaults.update(kwargs)
    return Tache(**defaults)


def test_une_seule_tache():
    taches = [make_tache()]
    solution, echecs = resoudre_csp(taches)
    assert solution is not None
    assert "t1" in solution
    assert not echecs


def test_horaire_fixe_respecte():
    taches = [make_tache(horaire_fixe="10:00", duree_min=60)]
    solution, echecs = resoudre_csp(taches)
    assert solution is not None
    _, debut, fin = solution["t1"]
    assert debut == "10:00"
    assert fin == "11:00"


def test_horaire_fixe_hors_plage():
    """Cas 10: horaire fixe hors 08:00-20:00 doit échouer."""
    taches = [make_tache(horaire_fixe="21:00", duree_min=60)]
    solution, echecs = resoudre_csp(taches)
    assert solution is None
    assert len(echecs) > 0


def test_non_chevauchement():
    taches = [
        make_tache(id="t1", duree_min=60),
        make_tache(id="t2", duree_min=60),
    ]
    solution, echecs = resoudre_csp(taches)
    assert solution is not None
    _, d1, f1 = solution["t1"]
    _, d2, f2 = solution["t2"]
    s1, e1 = _time_to_minutes(d1), _time_to_minutes(f1)
    s2, e2 = _time_to_minutes(d2), _time_to_minutes(f2)
    # No overlap: one ends before other starts + PAUSE
    assert e1 + 10 <= s2 or e2 + 10 <= s1


def test_trois_horaires_fixes_chevauchement():
    """Cas 4: trois tâches à horaires fixes qui se chevauchent → échec."""
    taches = [
        make_tache(id="t1", horaire_fixe="09:00", duree_min=60),
        make_tache(id="t2", horaire_fixe="09:30", duree_min=60),
        make_tache(id="t3", horaire_fixe="09:45", duree_min=60),
    ]
    solution, echecs = resoudre_csp(taches)
    assert solution is None
    assert len(echecs) > 0


def test_dependance_meme_jour():
    """Cas 6: tB après tA."""
    taches = [
        make_tache(id="tA", duree_min=45),
        make_tache(id="tB", duree_min=60, dependances=["tA"]),
    ]
    solution, echecs = resoudre_csp(taches)
    assert solution is not None
    _, dA, fA = solution["tA"]
    _, dB, fB = solution["tB"]
    assert _time_to_minutes(fA) <= _time_to_minutes(dB)


def test_tache_vide():
    solution, echecs = resoudre_csp([])
    assert solution == {}
    assert echecs == []

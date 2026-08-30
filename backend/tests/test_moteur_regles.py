import pytest
from src.modele import Tache
from src.moteur_regles import arbitrer


def make_tache(id, nom, priorite, date="2026-09-01", horaire_fixe=None, duree_min=30):
    return Tache(
        id=id, nom=nom, date=date, duree_min=duree_min,
        horaire_fixe=horaire_fixe, priorite=priorite, dependances=[]
    )


def test_arbitrage_urgent_vs_important():
    ta = make_tache("t1", "Urgent Task", "urgent")
    tb = make_tache("t2", "Important Task", "important")
    result = arbitrer((ta, tb))
    assert result["resolu"] is True
    assert result["tache_a_decaler"] == "t2"
    assert result["tache_prioritaire"] == "t1"
    assert len(result["raison"]) > 0


def test_arbitrage_important_vs_flexible():
    ta = make_tache("t1", "Important Task", "important")
    tb = make_tache("t2", "Flexible Task", "flexible")
    result = arbitrer((ta, tb))
    assert result["resolu"] is True
    assert result["tache_a_decaler"] == "t2"
    assert result["tache_prioritaire"] == "t1"


def test_arbitrage_meme_priorite():
    ta = make_tache("t1", "Task A", "important")
    tb = make_tache("t2", "Task B", "important")
    result = arbitrer((ta, tb))
    assert result["resolu"] is False
    assert len(result["options"]) == 2
    assert "t1" in result["options"]
    assert "t2" in result["options"]
    assert len(result["raison"]) > 0


def test_arbitrage_flexible_vs_flexible():
    ta = make_tache("t1", "Flex A", "flexible")
    tb = make_tache("t2", "Flex B", "flexible")
    result = arbitrer((ta, tb))
    assert result["resolu"] is False


def test_arbitrage_raison_non_vide():
    """Chaque arbitrage doit produire une justification non vide."""
    ta = make_tache("t1", "Urgent", "urgent")
    tb = make_tache("t2", "Flexible", "flexible")
    result = arbitrer((ta, tb))
    assert result["raison"] and len(result["raison"].strip()) > 0

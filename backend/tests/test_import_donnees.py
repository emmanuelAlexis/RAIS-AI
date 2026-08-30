import pytest
from src.import_donnees import charger_taches
from src.modele import Tache

DATA_DIR = "data/cas_test"


def test_import_json_valide():
    taches = charger_taches(f"{DATA_DIR}/cas_01.json")
    assert len(taches) == 3
    assert all(isinstance(t, Tache) for t in taches)


def test_import_csv_valide():
    taches = charger_taches(f"{DATA_DIR}/cas_01.csv")
    assert len(taches) == 3
    assert all(isinstance(t, Tache) for t in taches)


def test_import_excel_valide():
    taches = charger_taches(f"{DATA_DIR}/cas_01.xlsx")
    assert len(taches) == 3
    assert all(isinstance(t, Tache) for t in taches)


def test_import_csv_json_equivalence():
    taches_json = charger_taches(f"{DATA_DIR}/cas_01.json")
    taches_csv = charger_taches(f"{DATA_DIR}/cas_01.csv")
    assert len(taches_json) == len(taches_csv)
    for j, c in zip(sorted(taches_json, key=lambda t: t.id), sorted(taches_csv, key=lambda t: t.id)):
        assert j.id == c.id
        assert j.nom == c.nom
        assert j.date == c.date
        assert j.duree_min == c.duree_min
        assert j.priorite == c.priorite


def test_import_excel_json_equivalence():
    taches_json = charger_taches(f"{DATA_DIR}/cas_01.json")
    taches_xlsx = charger_taches(f"{DATA_DIR}/cas_01.xlsx")
    assert len(taches_json) == len(taches_xlsx)
    for j, x in zip(sorted(taches_json, key=lambda t: t.id), sorted(taches_xlsx, key=lambda t: t.id)):
        assert j.id == x.id
        assert j.nom == x.nom
        assert j.date == x.date
        assert j.duree_min == x.duree_min
        assert j.priorite == x.priorite


def test_import_valeur_manquante_duree():
    """Cas 3: tâche sans duree_min doit utiliser la valeur par défaut 30."""
    taches = charger_taches(f"{DATA_DIR}/cas_03.json")
    assert len(taches) == 1
    assert taches[0].duree_min == 30


def test_import_liste_vide():
    """Cas 9: fichier JSON vide doit retourner une liste vide."""
    taches = charger_taches(f"{DATA_DIR}/cas_09.json")
    assert taches == []


def test_import_fichier_inexistant():
    with pytest.raises(FileNotFoundError):
        charger_taches("data/cas_test/inexistant.json")


def test_import_format_non_supporte(tmp_path):
    f = tmp_path / "test.txt"
    f.write_text("hello")
    with pytest.raises(ValueError, match="non supporté"):
        charger_taches(str(f))


def test_import_date_invalide(tmp_path):
    """Un CSV avec une date malformée doit lever une erreur explicite."""
    bad_csv = tmp_path / "bad.csv"
    bad_csv.write_text("id,nom,date,priorite\nt1,test,2026-13-99,flexible\n")
    with pytest.raises(ValueError):
        charger_taches(str(bad_csv))

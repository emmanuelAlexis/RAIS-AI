from typing import Tuple, Dict
from .modele import Tache, PRIORITES_BAREME


def arbitrer(conflit: Tuple[Tache, Tache]) -> Dict:
    """
    Arbitre un conflit entre deux tâches.
    Retourne un dict avec:
    - resolu: bool
    - tache_a_decaler: str | None (id de la tâche à décaler)
    - tache_prioritaire: str | None (id de la tâche prioritaire)
    - raison: str
    - options: list[str] si non résolu
    """
    a, b = conflit
    prio_a = PRIORITES_BAREME[a.priorite]
    prio_b = PRIORITES_BAREME[b.priorite]

    if prio_a > prio_b:
        return {
            "resolu": True,
            "tache_a_decaler": b.id,
            "tache_prioritaire": a.id,
            "raison": (
                f"La tâche '{a.nom}' ({a.priorite}, score={prio_a}) est plus prioritaire que "
                f"'{b.nom}' ({b.priorite}, score={prio_b}). "
                f"La tâche '{b.nom}' sera décalée pour libérer le créneau."
            ),
            "options": []
        }
    elif prio_b > prio_a:
        return {
            "resolu": True,
            "tache_a_decaler": a.id,
            "tache_prioritaire": b.id,
            "raison": (
                f"La tâche '{b.nom}' ({b.priorite}, score={prio_b}) est plus prioritaire que "
                f"'{a.nom}' ({a.priorite}, score={prio_a}). "
                f"La tâche '{a.nom}' sera décalée pour libérer le créneau."
            ),
            "options": []
        }
    else:
        return {
            "resolu": False,
            "tache_a_decaler": None,
            "tache_prioritaire": None,
            "raison": (
                f"Les tâches '{a.nom}' et '{b.nom}' ont la même priorité ({a.priorite}, score={prio_a}). "
                f"L'arbitrage automatique est impossible. Intervention manuelle requise."
            ),
            "options": [a.id, b.id]
        }

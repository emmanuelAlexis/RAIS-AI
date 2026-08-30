from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional, List, Tuple
from datetime import datetime

HEURE_DEBUT = "08:00"
HEURE_FIN = "20:00"
PAUSE_MIN = 10

PRIORITES_BAREME = {
    "urgent": 3,
    "important": 2,
    "flexible": 1
}

class Tache(BaseModel):
    id: str
    nom: str
    date: str
    duree_min: int = 30
    horaire_fixe: Optional[str] = None
    plage_disponibilite: Optional[List[Tuple[str, str]]] = None
    priorite: Literal["urgent", "important", "flexible"]
    dependances: List[str] = Field(default_factory=list)

    @field_validator('date')
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Le format de la date doit être YYYY-MM-DD")
        return v

    @field_validator('horaire_fixe')
    @classmethod
    def validate_horaire_format(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            try:
                datetime.strptime(v, "%H:%M")
            except ValueError:
                raise ValueError("Le format de l'horaire doit être HH:MM")
        return v

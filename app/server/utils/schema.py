from typing import Dict, Optional
from pydantic import BaseModel # type: ignore
from datetime import datetime
import uuid


# ---------- Profiles ----------

class Profile(BaseModel):
    profile_id: str
    name: str
    created_at: datetime


class ProfileCreate(BaseModel):
    name: str


# ---------- Buttons ----------

class ButtonBase(BaseModel):
    button_id: str
    profile_id: str
    type: str
    label: str
    config: Dict
    created_at: datetime


class ButtonCreate(BaseModel):
    profile_id: str
    type: str
    label: str


class ButtonConfigUpdate(BaseModel):
    config: Dict


# ---------- Helpers ----------

def generate_id() -> str:
    return str(uuid.uuid4())

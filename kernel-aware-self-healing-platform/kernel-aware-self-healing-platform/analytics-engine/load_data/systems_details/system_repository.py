import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from system_config import SYSTEM_ID


def get_active_systems(db):
    active_systems = [SYSTEM_ID]
    return active_systems

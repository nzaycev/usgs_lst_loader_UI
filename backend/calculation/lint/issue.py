"""
Классы для представления проблем валидации.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class Issue:
    """Проблема валидации"""
    message: str
    path: str
    line: Optional[int] = None
    column: Optional[int] = None
    is_error: bool = True



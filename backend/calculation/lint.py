#!/usr/bin/env python3
"""
Точка входа для валидатора манифеста (обратная совместимость).
"""

import sys
from pathlib import Path

# Добавляем путь к модулю lint
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lint.main import main

if __name__ == "__main__":
    main()

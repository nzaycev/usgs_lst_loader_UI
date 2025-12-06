#!/usr/bin/env python3
"""
Точка входа для валидатора манифеста.
"""

import sys
from pathlib import Path
from .manifest_validator import ManifestValidator


def main():
    """Главная функция"""
    if len(sys.argv) < 2:
        print("Usage: python -m lint.main <manifest.yml>", file=sys.stderr)
        sys.exit(1)
    
    manifest_path = sys.argv[1]
    
    # Проверяем существование файла
    if not Path(manifest_path).exists():
        print(f"ERROR: Manifest file not found: {manifest_path}", file=sys.stderr)
        sys.exit(1)
    
    validator = ManifestValidator(manifest_path)
    is_valid = validator.validate()
    validator.print_results()
    
    # Возвращаем код выхода: 0 если нет ошибок, 1 если есть ошибки
    sys.exit(0 if is_valid else 1)


if __name__ == "__main__":
    main()



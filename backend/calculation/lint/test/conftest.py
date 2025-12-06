"""Pytest configuration and fixtures"""

import pytest
import tempfile
import os
import sys
from pathlib import Path

# Add project root to Python path for imports
# conftest.py is in backend/calculation/lint/test/
# Project root is 5 levels up
project_root = Path(__file__).parent.parent.parent.parent.parent.resolve()
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# Disable strict mode for tests to avoid exit(1) on unused rules
os.environ['LINT_STRICT_MODE'] = 'false'


@pytest.fixture
def schema_path():
    """Path to manifest schema file"""
    schema_file = Path(__file__).parent.parent / "manifest_schema.yml"
    return str(schema_file)


@pytest.fixture
def temp_manifest_file():
    """Create a temporary manifest file for testing"""
    import contextlib
    
    @contextlib.contextmanager
    def _create_manifest(content: str):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yml', delete=False, encoding='utf-8') as f:
            f.write(content)
            temp_path = f.name
        
        try:
            yield temp_path
        finally:
            # Cleanup
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    return _create_manifest


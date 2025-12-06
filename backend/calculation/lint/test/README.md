# Manifest Validator Tests

This directory contains tests for the manifest validator.

## Test Structure

- `test_schema_validation.py` - Tests for schema structure validation
- `test_warnings.py` - Tests for validation warnings
- `test_references.py` - Tests for reference validation (conditions, inputs, outputs, arguments)
- `test_conditions.py` - Tests for conditions validation logic

## Running Tests

To run all tests:
```bash
pytest backend/calculation/lint/test/
```

To run a specific test file:
```bash
pytest backend/calculation/lint/test/test_schema_validation.py
```

To run a specific test:
```bash
pytest backend/calculation/lint/test/test_schema_validation.py::TestSchemaValidation::test_valid_manifest
```

## Test Coverage

The tests cover:
1. **Schema Validation**: Required fields, field types, YAML syntax
2. **Warnings**: Empty lists, single element lists, unknown operators
3. **References**: Arguments, inputs, outputs, collections, datasets
4. **Conditions**: Simple conditions, operators (or, and, not, equal), nested conditions


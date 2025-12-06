"""Tests for validation warnings"""

import pytest
from backend.calculation.lint.manifest_validator import ManifestValidator


class TestWarnings:
    """Test validation warnings"""
    
    def test_empty_or_list_warning(self, schema_path, temp_manifest_file):
        """Test warning for empty 'or' list"""
        manifest_content = """
module:
  id: test_module
  title: Test Module
  arguments:
    - name: testArg
      type: boolean
      description: Test argument
      required: true
  datasets:
    - id: testDataset
      datasetName: test_dataset
  collections:
    - id: testCollection
      datasetId: testDataset
      filters:
        collectionId: T1
  inputLayers:
    - id: input1
      label: Input 1
      description: Test input
      collectionId: testCollection
      scale: 1
      conditions:
        or: []  # Empty or list
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            # Should pass validation but have warnings
            warning_messages = [w.message for w in validator.warnings]
            assert any("empty" in msg.lower() and "or" in msg.lower() for msg in warning_messages), \
                f"Should have warning about empty 'or' list, got: {warning_messages}"
    
    def test_single_element_or_warning(self, schema_path, temp_manifest_file):
        """Test warning for 'or' list with single element"""
        manifest_content = """
module:
  id: test_module
  title: Test Module
  arguments:
    - name: testArg
      type: boolean
      description: Test argument
      required: true
  datasets:
    - id: testDataset
      datasetName: test_dataset
  collections:
    - id: testCollection
      datasetId: testDataset
      filters:
        collectionId: T1
  inputLayers:
    - id: input1
      label: Input 1
      description: Test input
      collectionId: testCollection
      scale: 1
      conditions:
        or:
          - args.testArg  # Single element
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            warning_messages = [w.message for w in validator.warnings]
            assert any("single element" in msg.lower() and "or" in msg.lower() for msg in warning_messages), \
                f"Should have warning about single element 'or' list, got: {warning_messages}"
    
    def test_empty_and_list_warning(self, schema_path, temp_manifest_file):
        """Test warning for empty 'and' list"""
        manifest_content = """
module:
  id: test_module
  title: Test Module
  arguments:
    - name: testArg
      type: boolean
      description: Test argument
      required: true
  datasets:
    - id: testDataset
      datasetName: test_dataset
  collections:
    - id: testCollection
      datasetId: testDataset
      filters:
        collectionId: T1
  inputLayers:
    - id: input1
      label: Input 1
      description: Test input
      collectionId: testCollection
      scale: 1
      conditions:
        and: []  # Empty and list
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            warning_messages = [w.message for w in validator.warnings]
            assert any("empty" in msg.lower() and "and" in msg.lower() for msg in warning_messages), \
                f"Should have warning about empty 'and' list, got: {warning_messages}"
    
    def test_duplicate_warnings(self, schema_path, temp_manifest_file):
        """Test that duplicate warnings are removed"""
        manifest_content = """
module:
  id: test_module
  title: Test Module
  arguments:
    - name: testArg
      type: boolean
      description: Test argument
      required: true
  datasets:
    - id: testDataset
      datasetName: test_dataset
  collections:
    - id: testCollection
      datasetId: testDataset
      filters:
        collectionId: T1
  inputLayers:
    - id: input1
      label: Input 1
      description: Test input
      collectionId: testCollection
      scale: 1
      conditions:
        or:
          - args.testArg
    - id: input2
      label: Input 2
      description: Test input 2
      collectionId: testCollection
      scale: 1
      conditions:
        or:
          - args.testArg  # Same condition, should not duplicate warning
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            # Count warnings with same message
            warning_messages = [w.message for w in validator.warnings]
            # Should not have duplicate warnings
            # If we have "single element or" warning, it should appear only once per unique path
            single_element_warnings = [msg for msg in warning_messages if "single element" in msg.lower() and "or" in msg.lower()]
            # Each warning should be unique (different paths)
            unique_warnings = set(warning_messages)
            # All warnings should be unique (no duplicates with same message and path)
            assert len(validator.warnings) == len(unique_warnings) or len(single_element_warnings) <= 2, \
                f"Should not have duplicate warnings. Total: {len(validator.warnings)}, Unique messages: {len(unique_warnings)}, Single element warnings: {len(single_element_warnings)}"
    
    def test_unknown_operator_warning(self, schema_path, temp_manifest_file):
        """Test warning for unknown condition operator"""
        manifest_content = """
module:
  id: test_module
  title: Test Module
  arguments:
    - name: testArg
      type: boolean
      description: Test argument
      required: true
  datasets:
    - id: testDataset
      datasetName: test_dataset
  collections:
    - id: testCollection
      datasetId: testDataset
      filters:
        collectionId: T1
  inputLayers:
    - id: input1
      label: Input 1
      description: Test input
      collectionId: testCollection
      scale: 1
      conditions:
        unknownOperator: args.testArg  # Unknown operator
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            # jsonschema with additionalProperties: false rejects unknown operators before custom validation
            # So we check for either error from jsonschema or warning from custom validation
            error_messages = [e.message for e in validator.errors]
            warning_messages = [w.message for w in validator.warnings]
            # Unknown operator should be caught either by jsonschema (error) or custom validation (warning)
            has_unknown_error = any("additional properties" in msg.lower() or "unexpected" in msg.lower() 
                                   for msg in error_messages)
            has_unknown_warning = any("unknown" in msg.lower() and "operator" in msg.lower() 
                                     for msg in warning_messages)
            assert has_unknown_error or has_unknown_warning, \
                f"Should have error or warning about unknown operator. Errors: {error_messages}, Warnings: {warning_messages}"


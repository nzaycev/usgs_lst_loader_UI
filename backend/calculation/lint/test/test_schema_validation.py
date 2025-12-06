"""Tests for schema structure validation"""

import pytest
from backend.calculation.lint.manifest_validator import ManifestValidator


class TestSchemaValidation:
    """Test schema structure validation"""
    
    def test_valid_manifest(self, schema_path, temp_manifest_file):
        """Test that a valid manifest passes schema validation"""
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
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is True, f"Valid manifest should pass validation. Errors: {[e.message for e in validator.errors]}"
            assert len(validator.errors) == 0, f"Should have no errors, got: {[e.message for e in validator.errors]}"
    
    def test_missing_required_module(self, schema_path, temp_manifest_file):
        """Test that missing 'module' field is detected"""
        manifest_content = """
title: Test
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is False, "Manifest without 'module' should fail validation"
            assert len(validator.errors) > 0, "Should have errors for missing module"
            error_messages = [e.message for e in validator.errors]
            assert any("module" in msg.lower() or "required" in msg.lower() for msg in error_messages), \
                f"Should have error about missing module, got: {error_messages}"
    
    def test_missing_required_fields(self, schema_path, temp_manifest_file):
        """Test that missing required fields are detected"""
        manifest_content = """
module:
  id: test_module
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is False, "Manifest with missing required fields should fail"
            error_messages = [e.message for e in validator.errors]
            # Should have errors about missing required fields
            assert any("title" in msg.lower() or "required" in msg.lower() for msg in error_messages), \
                f"Should have error about missing required fields, got: {error_messages}"
    
    def test_invalid_field_type(self, schema_path, temp_manifest_file):
        """Test that invalid field types are detected"""
        manifest_content = """
module:
  id: test_module
  title: Test Module
  arguments:
    - name: testArg
      type: boolean
      description: Test argument
      required: true
      required: "not a boolean"  # Should be boolean
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
      scale: "not a number"  # Should be number
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is False, "Manifest with invalid types should fail"
            error_messages = [e.message for e in validator.errors]
            # Should have errors about type mismatches
            assert any("type" in msg.lower() or "number" in msg.lower() or "boolean" in msg.lower() 
                      for msg in error_messages), \
                f"Should have type errors, got: {error_messages}"
    
    def test_invalid_argument_type_enum(self, schema_path, temp_manifest_file):
        """Test that enum arguments require options field"""
        manifest_content = """
module:
  id: test_module
  title: Test Module
  arguments:
    - name: testArg
      type: enum
      description: Test argument
      # Missing options field
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
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is False, "Enum argument without options should fail"
            error_messages = [e.message for e in validator.errors]
            assert any("options" in msg.lower() or "required" in msg.lower() for msg in error_messages), \
                f"Should have error about missing options, got: {error_messages}"
    
    def test_invalid_yaml_syntax(self, schema_path, temp_manifest_file):
        """Test that invalid YAML syntax is detected"""
        manifest_content = """
module:
  id: test_module
  title: Test Module
  arguments:
    - name: testArg
      type: boolean
      description: Test argument
      required: true
    invalid: yaml: syntax: error: here
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            # Should either fail to load or fail validation
            if not result:
                error_messages = [e.message for e in validator.errors]
                assert any("yaml" in msg.lower() or "syntax" in msg.lower() or "invalid" in msg.lower() 
                          for msg in error_messages), \
                    f"Should have YAML syntax error, got: {error_messages}"


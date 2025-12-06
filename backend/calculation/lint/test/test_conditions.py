"""Tests for conditions validation"""

import pytest
from backend.calculation.lint.manifest_validator import ManifestValidator


class TestConditionsValidation:
    """Test conditions validation logic"""
    
    def test_valid_simple_condition(self, schema_path, temp_manifest_file):
        """Test valid simple condition (reference)"""
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
      conditions: args.testArg
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is True, f"Valid simple condition should pass. Errors: {[e.message for e in validator.errors]}"
    
    def test_valid_or_condition(self, schema_path, temp_manifest_file):
        """Test valid 'or' condition"""
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
          - outputs.output1
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is True, f"Valid 'or' condition should pass. Errors: {[e.message for e in validator.errors]}"
    
    def test_valid_and_condition(self, schema_path, temp_manifest_file):
        """Test valid 'and' condition"""
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
        and:
          - args.testArg
          - outputs.output1
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is True, f"Valid 'and' condition should pass. Errors: {[e.message for e in validator.errors]}"
    
    def test_valid_not_condition(self, schema_path, temp_manifest_file):
        """Test valid 'not' condition"""
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
        not: args.testArg
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is True, f"Valid 'not' condition should pass. Errors: {[e.message for e in validator.errors]}"
    
    def test_valid_equal_condition(self, schema_path, temp_manifest_file):
        """Test valid 'equal' condition"""
        manifest_content = """
module:
  id: test_module
  title: Test Module
  arguments:
    - name: testArg
      type: enum
      description: Test argument
      options:
        - value1
        - value2
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
        equal: args.testArg
        value: value1
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is True, f"Valid 'equal' condition should pass. Errors: {[e.message for e in validator.errors]}"
    
    def test_invalid_equal_missing_value(self, schema_path, temp_manifest_file):
        """Test that 'equal' condition without 'value' field fails"""
        manifest_content = """
module:
  id: test_module
  title: Test Module
  arguments:
    - name: testArg
      type: enum
      description: Test argument
      options:
        - value1
        - value2
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
        equal: args.testArg
        # Missing value field
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is False, "'equal' condition without 'value' should fail"
            error_messages = [e.message for e in validator.errors]
            # jsonschema validates structure first, so error format is different
            assert any("value" in msg.lower() or "required" in msg.lower() or "additional properties" in msg.lower() 
                      for msg in error_messages), \
                f"Should have error about missing 'value' field, got: {error_messages}"
    
    def test_invalid_equal_missing_reference(self, schema_path, temp_manifest_file):
        """Test that 'equal' condition without 'equal' field fails"""
        manifest_content = """
module:
  id: test_module
  title: Test Module
  arguments:
    - name: testArg
      type: enum
      description: Test argument
      options:
        - value1
        - value2
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
        value: value1
        # Missing equal field
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is False, "'equal' condition without 'equal' field should fail"
            error_messages = [e.message for e in validator.errors]
            # jsonschema validates structure first, so error format is different
            assert any("equal" in msg.lower() or "required" in msg.lower() or "additional properties" in msg.lower() 
                      for msg in error_messages), \
                f"Should have error about missing 'equal' field, got: {error_messages}"
    
    def test_invalid_top_level_array(self, schema_path, temp_manifest_file):
        """Test that top-level array in conditions fails"""
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
        - args.testArg  # Top-level array (invalid)
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is False, "Top-level array in conditions should fail"
            error_messages = [e.message for e in validator.errors]
            # jsonschema validates structure first, so error format is different
            assert any("array" in msg.lower() or "type" in msg.lower() or "object" in msg.lower() 
                      for msg in error_messages), \
                f"Should have error about top-level array, got: {error_messages}"
    
    def test_nested_conditions(self, schema_path, temp_manifest_file):
        """Test nested conditions (or with not)"""
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
          - not:
              outputs.output1
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is True, f"Nested conditions should pass. Errors: {[e.message for e in validator.errors]}"


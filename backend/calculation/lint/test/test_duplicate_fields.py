"""Tests for duplicate fields validation"""

import pytest
import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.calculation.lint.manifest_validator import ManifestValidator


class TestDuplicateFields:
    """Test validation of duplicate fields in object arrays"""
    
    def test_duplicate_argument_name(self, schema_path, temp_manifest_file):
        """Test error for duplicate argument name"""
        manifest_content = """
module:
  id: test_module
  title: Test Module
  arguments:
    - name: testArg
      type: boolean
      description: Test argument
      required: true
    - name: testArg  # Duplicate name
      type: boolean
      description: Another test argument
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
            assert result is False, "Duplicate argument name should fail validation"
            error_messages = [e.message for e in validator.errors]
            assert any("testArg" in msg and "duplicate" in msg.lower() and "name" in msg.lower() 
                      for msg in error_messages), \
                f"Should have error about duplicate argument name, got: {error_messages}"
    
    def test_duplicate_dataset_id(self, schema_path, temp_manifest_file):
        """Test error for duplicate dataset ID"""
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
    - id: testDataset  # Duplicate ID
      datasetName: another_dataset
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
            assert result is False, "Duplicate dataset ID should fail validation"
            error_messages = [e.message for e in validator.errors]
            assert any("testDataset" in msg and "duplicate" in msg.lower() and "id" in msg.lower() 
                      for msg in error_messages), \
                f"Should have error about duplicate dataset ID, got: {error_messages}"
    
    def test_duplicate_collection_id(self, schema_path, temp_manifest_file):
        """Test error for duplicate collection ID"""
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
    - id: testCollection  # Duplicate ID
      datasetId: testDataset
      filters:
        collectionId: T2
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
            assert result is False, "Duplicate collection ID should fail validation"
            error_messages = [e.message for e in validator.errors]
            assert any("testCollection" in msg and "duplicate" in msg.lower() and "id" in msg.lower() 
                      for msg in error_messages), \
                f"Should have error about duplicate collection ID, got: {error_messages}"
    
    def test_duplicate_input_layer_id(self, schema_path, temp_manifest_file):
        """Test error for duplicate input layer ID"""
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
    - id: input1  # Duplicate ID
      label: Input 2
      description: Another test input
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
            assert result is False, "Duplicate input layer ID should fail validation"
            error_messages = [e.message for e in validator.errors]
            assert any("input1" in msg and "duplicate" in msg.lower() and "id" in msg.lower() 
                      for msg in error_messages), \
                f"Should have error about duplicate input layer ID, got: {error_messages}"
    
    def test_duplicate_output_layer_id(self, schema_path, temp_manifest_file):
        """Test error for duplicate output layer ID"""
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
    - id: output1  # Duplicate ID
      label: Output 2
      description: Another test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is False, "Duplicate output layer ID should fail validation"
            error_messages = [e.message for e in validator.errors]
            assert any("output1" in msg and "duplicate" in msg.lower() and "id" in msg.lower() 
                      for msg in error_messages), \
                f"Should have error about duplicate output layer ID, got: {error_messages}"
    
    def test_no_duplicates_valid(self, schema_path, temp_manifest_file):
        """Test that manifest with no duplicates passes validation"""
        manifest_content = """
module:
  id: test_module
  title: Test Module
  arguments:
    - name: testArg1
      type: boolean
      description: Test argument 1
      required: true
    - name: testArg2
      type: boolean
      description: Test argument 2
      required: true
  datasets:
    - id: testDataset1
      datasetName: test_dataset_1
    - id: testDataset2
      datasetName: test_dataset_2
  collections:
    - id: testCollection1
      datasetId: testDataset1
      filters:
        collectionId: T1
    - id: testCollection2
      datasetId: testDataset2
      filters:
        collectionId: T2
  inputLayers:
    - id: input1
      label: Input 1
      description: Test input 1
      collectionId: testCollection1
      scale: 1
    - id: input2
      label: Input 2
      description: Test input 2
      collectionId: testCollection2
      scale: 1
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output 1
      required: true
    - id: output2
      label: Output 2
      description: Test output 2
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is True, "Manifest with no duplicates should pass validation"
            duplicate_errors = [e for e in validator.errors if "duplicate" in e.message.lower()]
            assert len(duplicate_errors) == 0, \
                f"Should have no duplicate errors, got: {[e.message for e in duplicate_errors]}"


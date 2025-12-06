"""Tests for reference validation (conditions, inputs, outputs, arguments)"""

import pytest
from backend.calculation.lint.manifest_validator import ManifestValidator


class TestReferenceValidation:
    """Test reference validation between conditions, inputs, outputs, and arguments"""
    
    def test_valid_references(self, schema_path, temp_manifest_file):
        """Test that valid references pass validation"""
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
            assert result is True, f"Valid references should pass. Errors: {[e.message for e in validator.errors]}"
            # Should have no errors related to references
            ref_errors = [e for e in validator.errors if "not found" in e.message or "reference" in e.message.lower()]
            assert len(ref_errors) == 0, f"Should have no reference errors, got: {[e.message for e in ref_errors]}"
    
    def test_invalid_argument_reference(self, schema_path, temp_manifest_file):
        """Test that invalid argument reference is detected"""
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
        - args.nonExistentArg  # Invalid argument reference
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is False, "Invalid argument reference should fail"
            error_messages = [e.message for e in validator.errors]
            assert any("nonExistentArg" in msg or ("argument" in msg.lower() and "not found" in msg.lower()) 
                      for msg in error_messages), \
                f"Should have error about invalid argument reference, got: {error_messages}"
    
    def test_invalid_output_reference(self, schema_path, temp_manifest_file):
        """Test that invalid output reference is detected"""
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
        - outputs.nonExistentOutput  # Invalid output reference
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is False, "Invalid output reference should fail"
            error_messages = [e.message for e in validator.errors]
            assert any("nonExistentOutput" in msg or ("output" in msg.lower() and "not found" in msg.lower()) 
                      for msg in error_messages), \
                f"Should have error about invalid output reference, got: {error_messages}"
    
    def test_invalid_input_reference(self, schema_path, temp_manifest_file):
        """Test that invalid input reference is detected"""
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
        - inputs.nonExistentInput  # Invalid input reference
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is False, "Invalid input reference should fail"
            error_messages = [e.message for e in validator.errors]
            assert any("nonExistentInput" in msg or ("input" in msg.lower() and "not found" in msg.lower()) 
                      for msg in error_messages), \
                f"Should have error about invalid input reference, got: {error_messages}"
    
    def test_invalid_collection_reference(self, schema_path, temp_manifest_file):
        """Test that invalid collection reference is detected"""
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
      collectionId: nonExistentCollection  # Invalid collection reference
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
            assert result is False, "Invalid collection reference should fail"
            error_messages = [e.message for e in validator.errors]
            assert any("nonExistentCollection" in msg or ("collection" in msg.lower() and "not found" in msg.lower()) 
                      for msg in error_messages), \
                f"Should have error about invalid collection reference, got: {error_messages}"
    
    def test_invalid_dataset_reference(self, schema_path, temp_manifest_file):
        """Test that invalid dataset reference in collection is detected"""
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
      datasetId: nonExistentDataset  # Invalid dataset reference
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
            assert result is False, "Invalid dataset reference should fail"
            error_messages = [e.message for e in validator.errors]
            assert any("nonExistentDataset" in msg or ("dataset" in msg.lower() and "not found" in msg.lower()) 
                      for msg in error_messages), \
                f"Should have error about invalid dataset reference, got: {error_messages}"
    
    def test_nested_conditions_references(self, schema_path, temp_manifest_file):
        """Test references in nested conditions"""
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
              equal: args.nonExistentArg  # Invalid reference in nested condition
              value: test
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            assert result is False, "Invalid reference in nested condition should fail"
            error_messages = [e.message for e in validator.errors]
            assert any("nonExistentArg" in msg or ("argument" in msg.lower() and "not found" in msg.lower()) 
                      for msg in error_messages), \
                f"Should have error about invalid reference in nested condition, got: {error_messages}"


"""Tests for unused resources validation"""

import pytest
import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.calculation.lint.manifest_validator import ManifestValidator


class TestUnusedResources:
    """Test validation of unused datasets and collections"""
    
    def test_unused_dataset_warning(self, schema_path, temp_manifest_file):
        """Test warning for unused dataset"""
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
    - id: usedDataset
      datasetName: used_dataset
    - id: unusedDataset
      datasetName: unused_dataset  # This dataset is not used
  collections:
    - id: testCollection
      datasetId: usedDataset  # Only usedDataset is referenced
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
            # Should pass validation but have warning
            warning_messages = [w.message for w in validator.warnings]
            assert any("unusedDataset" in msg or ("dataset" in msg.lower() and "unused" in msg.lower()) for msg in warning_messages), \
                f"Should have warning about unused dataset, got: {warning_messages}"
    
    def test_unused_collection_warning(self, schema_path, temp_manifest_file):
        """Test warning for unused collection"""
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
    - id: usedCollection
      datasetId: testDataset
      filters:
        collectionId: T1
    - id: unusedCollection
      datasetId: testDataset
      filters:
        collectionId: T2  # This collection is not used
  inputLayers:
    - id: input1
      label: Input 1
      description: Test input
      collectionId: usedCollection  # Only usedCollection is referenced
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
            # Should pass validation but have warning
            warning_messages = [w.message for w in validator.warnings]
            assert any("unusedCollection" in msg or ("collection" in msg.lower() and "unused" in msg.lower()) for msg in warning_messages), \
                f"Should have warning about unused collection, got: {warning_messages}"
    
    def test_all_resources_used_no_warnings(self, schema_path, temp_manifest_file):
        """Test that no warnings are generated when all resources are used"""
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
            # Should pass validation with no unused resource warnings
            warning_messages = [w.message for w in validator.warnings]
            unused_warnings = [msg for msg in warning_messages if "unused" in msg.lower()]
            assert len(unused_warnings) == 0, \
                f"Should have no unused resource warnings, got: {unused_warnings}"
    
    def test_multiple_unused_resources(self, schema_path, temp_manifest_file):
        """Test warnings for multiple unused resources"""
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
    - id: usedDataset
      datasetName: used_dataset
    - id: unusedDataset1
      datasetName: unused_dataset_1
    - id: unusedDataset2
      datasetName: unused_dataset_2
  collections:
    - id: usedCollection
      datasetId: usedDataset
      filters:
        collectionId: T1
    - id: unusedCollection1
      datasetId: usedDataset
      filters:
        collectionId: T2
    - id: unusedCollection2
      datasetId: usedDataset
      filters:
        collectionId: T3
  inputLayers:
    - id: input1
      label: Input 1
      description: Test input
      collectionId: usedCollection
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
            # Should have warnings for 2 unused datasets and 2 unused collections
            warning_messages = [w.message for w in validator.warnings]
            # Count warnings that mention specific unused dataset IDs
            unused_dataset_warnings = [
                msg for msg in warning_messages 
                if ("unusedDataset1" in msg or "unusedDataset2" in msg) and "dataset" in msg.lower()
            ]
            # Count warnings that mention specific unused collection IDs
            unused_collection_warnings = [
                msg for msg in warning_messages 
                if ("unusedCollection1" in msg or "unusedCollection2" in msg) and "collection" in msg.lower()
            ]
            assert len(unused_dataset_warnings) == 2, \
                f"Should have 2 unused dataset warnings, got: {len(unused_dataset_warnings)}. Warnings: {warning_messages}"
            assert len(unused_collection_warnings) == 2, \
                f"Should have 2 unused collection warnings, got: {len(unused_collection_warnings)}. Warnings: {warning_messages}"


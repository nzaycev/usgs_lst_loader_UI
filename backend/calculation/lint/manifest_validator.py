"""
Main manifest validator class using JSON Schema for structure validation.
"""

import os
import yaml
from pathlib import Path
from typing import Dict, List, Any

from .issue import Issue
from .line_finder import LineFinder
from .formatter import IssueFormatter
from .schema_converter import SchemaConverter
from .schema_validator import SchemaValidator
from .conditions_validator import ConditionsValidator
from .validation_rules import ValidationRulesRegistry
from .layers_validator import LayersValidator


class ManifestValidator:
    """Manifest validator using JSON Schema for structure and custom validators for business logic"""
    
    def __init__(self, manifest_path: str, schema_path: str = None):
        self.manifest_path = Path(manifest_path).resolve()
        self.errors: List[Issue] = []
        self.warnings: List[Issue] = []
        self.manifest: Dict[str, Any] = {}
        self.manifest_lines: List[str] = []
        
        # Reference dictionaries for custom validations
        self.argument_names: set = set()
        self.dataset_ids: set = set()
        self.collection_ids: set = set()
        self.input_layer_ids: set = set()
        self.output_layer_ids: set = set()
        
        # Initialize utilities
        self.line_finder: LineFinder = None
        self.formatter: IssueFormatter = None
        
        # Load and convert schema
        self.schema_converter = SchemaConverter(schema_path)
        self.json_schema = self.schema_converter.get_json_schema()
        
        # Load validation rules registry
        # In tests, strict_mode is disabled via environment variable
        strict_mode = os.environ.get('LINT_STRICT_MODE', 'true').lower() == 'true'
        self.rules_registry = ValidationRulesRegistry(schema_path, strict_mode=strict_mode)
    
    def load_manifest(self) -> bool:
        """Load manifest from file"""
        try:
            # Load file as text for line analysis
            with open(self.manifest_path, 'r', encoding='utf-8') as f:
                self.manifest_lines = f.readlines()
            
            # Load as YAML
            with open(self.manifest_path, 'r', encoding='utf-8') as f:
                self.manifest = yaml.safe_load(f)
            
            if not self.manifest:
                self.errors.append(Issue("Manifest file is empty", "", line=1, is_error=True))
                return False
            
            # Initialize utilities after loading
            self.line_finder = LineFinder(self.manifest_lines)
            self.formatter = IssueFormatter(self.manifest_path, self.manifest_lines)
            
            return True
        except yaml.YAMLError as e:
            # Try to find error line
            error_line = 1
            if hasattr(e, 'problem_mark') and e.problem_mark:
                error_line = e.problem_mark.line + 1
            self.errors.append(Issue(f"Invalid YAML syntax: {e}", "", line=error_line, is_error=True))
            return False
        except FileNotFoundError:
            self.errors.append(Issue(f"Manifest file not found: {self.manifest_path}", "", is_error=True))
            return False
        except Exception as e:
            self.errors.append(Issue(f"Failed to load manifest: {e}", "", is_error=True))
            return False
    
    def validate(self) -> bool:
        """Perform full validation"""
        if not self.load_manifest():
            return False
        
        # Step 1: Validate structure using JSON Schema
        schema_validator = SchemaValidator(self.json_schema, self.line_finder, self.rules_registry)
        schema_errors, schema_warnings = schema_validator.validate(self.manifest)
        self.errors.extend(schema_errors)
        self.warnings.extend(schema_warnings)
        
        # If structure is invalid, we can't proceed with custom validations
        if schema_errors:
            return False
        
        module = self.manifest.get('module', {})
        if not module:
            return False
        
        # Step 2: Collect reference dictionaries for custom validations
        self._collect_references(module)
        
        # Step 3: Check for duplicate fields
        self._validate_duplicate_fields(module)
        
        # Step 4: Custom validations (references, conditions, etc.)
        self._validate_custom_rules(module)
        
        # Step 5: Check for unused resources
        self._validate_unused_resources(module)
        
        # Step 6: Validate conditions in input layers
        layers_validator = LayersValidator(
            self.line_finder,
            self.collection_ids,
            self.argument_names,
            self.input_layer_ids,
            self.output_layer_ids,
            self.manifest_lines
        )
        layers_validator.validate_conditions(
            module.get('inputLayers', []),
            self.errors,
            self.warnings
        )
        
        # Remove duplicate warnings (same message and path)
        self._remove_duplicate_warnings()
        
        # Rules registration is validated at startup (in ValidationRulesRegistry.__init__)
        # Rules usage is validated when get_rule() is called (exits if rule not found)
        # No need to validate usage here - rules are only used when needed
        
        return len(self.errors) == 0
    
    def _collect_references(self, module: Dict[str, Any]):
        """Collect IDs and names for reference validation"""
        # Collect argument names
        arguments = module.get('arguments', [])
        if isinstance(arguments, list):
            for arg in arguments:
                if isinstance(arg, dict) and 'name' in arg:
                    self.argument_names.add(arg['name'])
        
        # Collect dataset IDs
        datasets = module.get('datasets', [])
        if isinstance(datasets, list):
            for ds in datasets:
                if isinstance(ds, dict) and 'id' in ds:
                    self.dataset_ids.add(ds['id'])
        
        # Collect collection IDs
        collections = module.get('collections', [])
        if isinstance(collections, list):
            for coll in collections:
                if isinstance(coll, dict) and 'id' in coll:
                    self.collection_ids.add(coll['id'])
        
        # Collect output layer IDs (needed for conditions validation)
        output_layers = module.get('outputLayers', [])
        if isinstance(output_layers, list):
            for layer in output_layers:
                if isinstance(layer, dict) and 'id' in layer:
                    self.output_layer_ids.add(layer['id'])
        
        # Collect input layer IDs
        input_layers = module.get('inputLayers', [])
        if isinstance(input_layers, list):
            for layer in input_layers:
                if isinstance(layer, dict) and 'id' in layer:
                    self.input_layer_ids.add(layer['id'])
    
    def _validate_duplicate_fields(self, module: Dict[str, Any]):
        """Check for duplicate field values in object arrays"""
        # Check duplicate argument names
        arguments = module.get('arguments', [])
        if isinstance(arguments, list):
            seen_names = set()
            for i, arg in enumerate(arguments):
                if isinstance(arg, dict) and 'name' in arg:
                    arg_name = arg['name']
                    if arg_name in seen_names:
                        path = f"module.arguments.{i}.name"
                        line = self.line_finder.find_line_for_path(path)
                        rule = self.rules_registry.get_rule("no_duplicated_object_field")
                        if rule:
                            message = rule.get_message(field_name="name", value=arg_name, section="arguments")
                            self.errors.append(Issue(
                                message,
                                path,
                                line=line,
                                is_error=True
                            ))
                    seen_names.add(arg_name)
        
        # Check duplicate dataset IDs
        datasets = module.get('datasets', [])
        if isinstance(datasets, list):
            seen_ids = set()
            for i, ds in enumerate(datasets):
                if isinstance(ds, dict) and 'id' in ds:
                    dataset_id = ds['id']
                    if dataset_id in seen_ids:
                        path = f"module.datasets.{i}.id"
                        line = self.line_finder.find_line_for_path(path)
                        rule = self.rules_registry.get_rule("no_duplicated_object_field")
                        if rule:
                            message = rule.get_message(field_name="id", value=dataset_id, section="datasets")
                            self.errors.append(Issue(
                                message,
                                path,
                                line=line,
                                is_error=True
                            ))
                    seen_ids.add(dataset_id)
        
        # Check duplicate collection IDs
        collections = module.get('collections', [])
        if isinstance(collections, list):
            seen_ids = set()
            for i, coll in enumerate(collections):
                if isinstance(coll, dict) and 'id' in coll:
                    collection_id = coll['id']
                    if collection_id in seen_ids:
                        path = f"module.collections.{i}.id"
                        line = self.line_finder.find_line_for_path(path)
                        rule = self.rules_registry.get_rule("no_duplicated_object_field")
                        if rule:
                            message = rule.get_message(field_name="id", value=collection_id, section="collections")
                            self.errors.append(Issue(
                                message,
                                path,
                                line=line,
                                is_error=True
                            ))
                    seen_ids.add(collection_id)
        
        # Check duplicate input layer IDs
        input_layers = module.get('inputLayers', [])
        if isinstance(input_layers, list):
            seen_ids = set()
            for i, layer in enumerate(input_layers):
                if isinstance(layer, dict) and 'id' in layer:
                    layer_id = layer['id']
                    if layer_id in seen_ids:
                        path = f"module.inputLayers.{i}.id"
                        line = self.line_finder.find_line_for_path(path)
                        rule = self.rules_registry.get_rule("no_duplicated_object_field")
                        if rule:
                            message = rule.get_message(field_name="id", value=layer_id, section="inputLayers")
                            self.errors.append(Issue(
                                message,
                                path,
                                line=line,
                                is_error=True
                            ))
                    seen_ids.add(layer_id)
        
        # Check duplicate output layer IDs
        output_layers = module.get('outputLayers', [])
        if isinstance(output_layers, list):
            seen_ids = set()
            for i, layer in enumerate(output_layers):
                if isinstance(layer, dict) and 'id' in layer:
                    layer_id = layer['id']
                    if layer_id in seen_ids:
                        path = f"module.outputLayers.{i}.id"
                        line = self.line_finder.find_line_for_path(path)
                        rule = self.rules_registry.get_rule("no_duplicated_object_field")
                        if rule:
                            message = rule.get_message(field_name="id", value=layer_id, section="outputLayers")
                            self.errors.append(Issue(
                                message,
                                path,
                                line=line,
                                is_error=True
                            ))
                    seen_ids.add(layer_id)
    
    def _validate_custom_rules(self, module: Dict[str, Any]):
        """Validate custom business rules (references, conditions, etc.)"""
        # Validate collection references to datasets
        collections = module.get('collections', [])
        if isinstance(collections, list):
            for i, coll in enumerate(collections):
                if isinstance(coll, dict) and 'datasetId' in coll:
                    dataset_id = coll['datasetId']
                    if dataset_id not in self.dataset_ids:
                        path = f"module.collections.{i}.datasetId"
                        line = self.line_finder.find_line_for_path(path)
                        rule = self.rules_registry.get_rule("dataset_not_found")
                        if rule:
                            message = rule.get_message(dataset_id=dataset_id)
                            self.errors.append(Issue(
                                message,
                                path,
                                line=line,
                                is_error=True
                            ))
                        else:
                            # Fallback if rule not found
                            self.errors.append(Issue(
                                f"Referenced dataset '{dataset_id}' not found in datasets",
                                path,
                                line=line,
                                is_error=True
                                ))
    
    def _validate_unused_resources(self, module: Dict[str, Any]):
        """Check for unused datasets and collections"""
        # Collect used dataset IDs (from collections)
        used_dataset_ids = set()
        collections = module.get('collections', [])
        if isinstance(collections, list):
            for coll in collections:
                if isinstance(coll, dict) and 'datasetId' in coll:
                    used_dataset_ids.add(coll['datasetId'])
        
        # Check for unused datasets
        datasets = module.get('datasets', [])
        if isinstance(datasets, list):
            for i, ds in enumerate(datasets):
                if isinstance(ds, dict) and 'id' in ds:
                    dataset_id = ds['id']
                    if dataset_id not in used_dataset_ids:
                        path = f"module.datasets.{i}.id"
                        line = self.line_finder.find_line_for_path(path)
                        rule = self.rules_registry.get_rule("unused_dataset")
                        if rule:
                            message = rule.get_message(dataset_id=dataset_id)
                            self.warnings.append(Issue(
                                message,
                                path,
                                line=line,
                                is_error=False
                            ))
        
        # Collect used collection IDs (from input layers)
        used_collection_ids = set()
        input_layers = module.get('inputLayers', [])
        if isinstance(input_layers, list):
            for layer in input_layers:
                if isinstance(layer, dict) and 'collectionId' in layer:
                    used_collection_ids.add(layer['collectionId'])
        
        # Check for unused collections
        if isinstance(collections, list):
            for i, coll in enumerate(collections):
                if isinstance(coll, dict) and 'id' in coll:
                    collection_id = coll['id']
                    if collection_id not in used_collection_ids:
                        path = f"module.collections.{i}.id"
                        line = self.line_finder.find_line_for_path(path)
                        rule = self.rules_registry.get_rule("unused_collection")
                        if rule:
                            message = rule.get_message(collection_id=collection_id)
                            self.warnings.append(Issue(
                                message,
                                path,
                                line=line,
                                is_error=False
                            ))
        
        # Validate input layer references to collections
        input_layers = module.get('inputLayers', [])
        if isinstance(input_layers, list):
            for i, layer in enumerate(input_layers):
                if isinstance(layer, dict):
                    path = f"module.inputLayers.{i}"
                    
                    # Validate collectionId reference
                    if 'collectionId' in layer:
                        collection_id = layer['collectionId']
                        if collection_id not in self.collection_ids:
                            collection_path = f"{path}.collectionId"
                            line = self.line_finder.find_line_for_path(collection_path)
                            rule = self.rules_registry.get_rule("collection_not_found")
                            if rule:
                                message = rule.get_message(collection_id=collection_id)
                                self.errors.append(Issue(
                                    message,
                                    collection_path,
                                    line=line,
                                    is_error=True
                                ))
                            else:
                                # Fallback if rule not found
                                self.errors.append(Issue(
                                    f"Referenced collection '{collection_id}' not found in collections",
                                    collection_path,
                                    line=line,
                                    is_error=True
                                ))
                    
                    # Validate conditions (references to args, inputs, outputs)
                    if 'conditions' in layer:
                        conditions_validator = ConditionsValidator(
                            self.line_finder,
                            self.argument_names,
                            self.input_layer_ids,
                            self.output_layer_ids,
                            self.manifest_lines,
                            self.rules_registry
                        )
                        cond_errors, cond_warnings = conditions_validator.validate(
                            layer['conditions'],
                            f"{path}.conditions",
                            layer
                        )
                        self.errors.extend(cond_errors)
                        self.warnings.extend(cond_warnings)
    
    def _remove_duplicate_warnings(self):
        """Remove duplicate warnings (same message and path)"""
        seen = set()
        unique_warnings = []
        for warning in self.warnings:
            # Create a key from message and path to identify duplicates
            key = (warning.message, warning.path)
            if key not in seen:
                seen.add(key)
                unique_warnings.append(warning)
        self.warnings = unique_warnings
    
    def _normalize_yaml_booleans(self, data: Any) -> Any:
        """Convert YAML boolean keys (True/False) to strings"""
        if isinstance(data, dict):
            result = {}
            for key, value in data.items():
                # Convert True/False keys to 'true'/'false' strings
                if key is True:
                    new_key = 'true'
                elif key is False:
                    new_key = 'false'
                else:
                    new_key = key
                result[new_key] = self._normalize_yaml_booleans(value)
            return result
        elif isinstance(data, list):
            return [self._normalize_yaml_booleans(item) for item in data]
        else:
            return data
    
    def print_results(self):
        """Print validation results"""
        self.formatter.print_results(self.errors, self.warnings)

"""
Validator for conditions in input layers (structure validation is done by JSON Schema).
"""

from typing import Set, List, Optional
from .conditions_validator import ConditionsValidator
from .issue import Issue
from .line_finder import LineFinder
from .validation_rules import ValidationRulesRegistry


class LayersValidator:
    """Validator for conditions in input layers"""
    
    def __init__(self, line_finder: LineFinder, collection_ids: Set[str],
                 argument_names: Set[str], input_layer_ids: Set[str],
                 output_layer_ids: Set[str], manifest_lines: List[str],
                 rules_registry: Optional[ValidationRulesRegistry] = None):
        self.line_finder = line_finder
        self.collection_ids = collection_ids
        self.argument_names = argument_names
        self.input_layer_ids = input_layer_ids
        self.output_layer_ids = output_layer_ids
        self.manifest_lines = manifest_lines
        self.rules_registry = rules_registry or ValidationRulesRegistry()
    
    def validate_conditions(self, input_layers: list, errors: list, warnings: list):
        """Validate conditions in input layers (structure is already validated by JSON Schema)"""
        if not isinstance(input_layers, list):
            return
        
        # Create conditions validator
        conditions_validator = ConditionsValidator(
            self.line_finder,
            self.argument_names,
            self.input_layer_ids,
            self.output_layer_ids,
            self.manifest_lines,
            self.rules_registry
        )
        
        for i, layer in enumerate(input_layers):
            if not isinstance(layer, dict):
                continue
            
            # Validate conditions (references to args, inputs, outputs)
            if 'conditions' in layer:
                path = f"module.inputLayers.{i}.conditions"
                cond_errors, cond_warnings = conditions_validator.validate(
                    layer['conditions'],
                    path,
                    layer
                )
                errors.extend(cond_errors)
                warnings.extend(cond_warnings)

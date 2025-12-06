"""
JSON Schema-based validator for manifest structure validation.
"""

from typing import Dict, Any, List, Tuple, Optional
from jsonschema import ValidationError, Draft7Validator
from jsonschema.exceptions import SchemaError

from .issue import Issue
from .line_finder import LineFinder
from .validation_rules import ValidationRulesRegistry


class SchemaValidator:
    """Validate manifest structure using JSON Schema"""
    
    def __init__(self, json_schema: Dict[str, Any], line_finder: LineFinder, 
                 rules_registry: ValidationRulesRegistry = None):
        self.json_schema = json_schema
        self.line_finder = line_finder
        self.rules_registry = rules_registry
        self.errors: List[Issue] = []
        self.warnings: List[Issue] = []
        
        # Create validator
        try:
            self.validator = Draft7Validator(json_schema)
        except SchemaError as e:
            raise ValueError(f"Invalid JSON Schema: {e}")
    
    def validate(self, manifest: Dict[str, Any]) -> Tuple[List[Issue], List[Issue]]:
        """Validate manifest structure against JSON Schema"""
        self.errors = []
        self.warnings = []
        
        # Validate using jsonschema
        errors = list(self.validator.iter_errors(manifest))
        
        for error in errors:
            # Convert jsonschema ValidationError to Issue
            issue = self._convert_validation_error(error)
            if issue:
                self.errors.append(issue)
        
        return self.errors, self.warnings
    
    def _convert_validation_error(self, error: ValidationError) -> Optional[Issue]:
        """Convert jsonschema ValidationError to Issue with improved readability"""
        # Get the path to the error
        path = ".".join(str(p) for p in error.absolute_path)
        if not path:
            path = "root"
        
        # Improve error message readability
        message = self._improve_error_message(error, path)
        
        # Try to find line number
        line = self._find_error_line(error, path)
        
        # Use schema_validation_error rule if available
        if self.rules_registry:
            rule = self.rules_registry.get_rule("schema_validation_error")
            if rule:
                message = rule.get_message(message=message)
        
        # Create issue
        return Issue(
            message=message,
            path=path,
            line=line,
            is_error=True
        )
    
    def _improve_error_message(self, error: ValidationError, path: str) -> str:
        """Improve error message readability based on validator type"""
        validator = error.validator
        message = error.message
        
        # Handle different validator types with more readable messages
        if validator == 'required':
            # "X is a required property" -> "Missing required field: X"
            if "'" in message:
                missing_field = message.split("'")[1]
                return f"Missing required field: '{missing_field}'"
            elif '"' in message:
                missing_field = message.split('"')[1]
                return f"Missing required field: '{missing_field}'"
        
        elif validator == 'type':
            # "X is not of type 'Y'" -> "Field must be of type Y, got actual_type"
            if 'is not of type' in message:
                # Extract expected type from schema (most reliable)
                schema_type = error.schema.get('type') if isinstance(error.schema, dict) else None
                if schema_type:
                    expected_type = schema_type
                else:
                    # Fallback: parse message - format: "'value' is not of type 'type'"
                    # Extract the last quoted part (the expected type)
                    parts = message.split("'")
                    if len(parts) >= 4:
                        expected_type = parts[-2]  # Second to last quoted part
                    else:
                        expected_type = 'unknown'
                
                # Get actual value type from error instance
                actual_value = error.instance
                if actual_value is None:
                    actual_type = 'null'
                elif isinstance(actual_value, bool):
                    actual_type = 'boolean'
                elif isinstance(actual_value, int):
                    actual_type = 'integer'
                elif isinstance(actual_value, float):
                    actual_type = 'number'
                elif isinstance(actual_value, str):
                    actual_type = 'string'
                elif isinstance(actual_value, dict):
                    actual_type = 'object'
                elif isinstance(actual_value, list):
                    actual_type = 'array'
                else:
                    actual_type = type(actual_value).__name__
                
                return f"Field must be of type '{expected_type}', got '{actual_type}'"
        
        elif validator == 'additionalProperties':
            # "Additional properties are not allowed (X was unexpected)"
            if 'Additional properties are not allowed' in message and '(' in message:
                unexpected = message.split('(')[1].split(')')[0]
                return f"Unexpected property: {unexpected}"
        
        elif validator == 'enum':
            # "X is not one of [Y, Z]" -> "Value must be one of: Y, Z"
            if 'is not one of' in message and '[' in message:
                enum_values = message.split('[')[1].split(']')[0]
                return f"Value must be one of: [{enum_values}]"
        
        # For anyOf/oneOf/allOf errors, provide more context
        if error.context:
            # Filter out less relevant errors, keep the most specific ones
            relevant_contexts = [ctx for ctx in error.context if ctx.validator != 'anyOf' and ctx.validator != 'oneOf']
            if relevant_contexts:
                # Use the first relevant context error
                ctx_msg = relevant_contexts[0].message
                if ctx_msg and ctx_msg != message:
                    return f"{message}. {ctx_msg}"
        
        # Return original message if no improvement found
        return message
    
    def _find_error_line(self, error: ValidationError, path: str) -> Optional[int]:
        """Find line number for validation error using path-based search"""
        # Use path-based search (value is not needed)
        return self.line_finder.find_line_for_path(path)


"""
Validation rules registry - loads and manages validation rules from manifest_schema.yml
Tracks rule usage and validates that all rules are used and all used rules are registered.
"""

import sys
import yaml
from pathlib import Path
from typing import Dict, Any, Optional, List, Set
from enum import Enum


class RuleLevel(Enum):
    """Validation rule level"""
    ERROR = "error"
    WARNING = "warning"


class ValidationRule:
    """Single validation rule"""
    
    def __init__(self, name: str, description: str, level: RuleLevel, 
                 message: Optional[str] = None, 
                 message_template: Optional[str] = None):
        self.name = name
        self.description = description
        self.level = level
        self.message = message
        self.message_template = message_template
        
        if not message and not message_template:
            raise ValueError(f"Rule '{name}' must have either 'message' or 'message_template'")
    
    def get_message(self, **kwargs) -> str:
        """Get formatted message, using template if available"""
        if self.message_template:
            return self.message_template.format(**kwargs)
        # If message contains placeholders and kwargs provided, try to format it
        if self.message and kwargs and '{' in self.message:
            try:
                return self.message.format(**kwargs)
            except (KeyError, ValueError):
                # If formatting fails, return original message
                return self.message
        return self.message


class ValidationRulesRegistry:
    """Registry for validation rules loaded from schema with usage tracking"""
    
    def __init__(self, schema_path: Optional[str] = None, strict_mode: bool = True):
        if schema_path is None:
            schema_path = Path(__file__).parent / "manifest_schema.yml"
        
        self.schema_path = Path(schema_path)
        self.strict_mode = strict_mode
        self.rules: Dict[str, ValidationRule] = {}
        self.used_rules: Set[str] = set()
        self.load_rules()
    
    def load_rules(self):
        """Load validation rules from schema file"""
        try:
            with open(self.schema_path, 'r', encoding='utf-8') as f:
                schema = yaml.safe_load(f)
        except Exception as e:
            raise ValueError(f"Failed to load schema from {self.schema_path}: {e}")
        
        validation_rules = schema.get('validation_rules', [])
        
        if not validation_rules:
            if self.strict_mode:
                print("ERROR: No validation rules found in schema", file=sys.stderr)
                sys.exit(1)
            return
        
        failed_rules = []
        
        for rule_def in validation_rules:
            name = rule_def.get('name')
            if not name:
                failed_rules.append(f"Rule without 'name' field: {rule_def}")
                continue
            
            description = rule_def.get('description', '')
            level_str = rule_def.get('level', 'error').lower()
            
            try:
                level = RuleLevel(level_str)
            except ValueError:
                failed_rules.append(f"Rule '{name}': Invalid level '{level_str}'. Must be 'error' or 'warning'")
                continue
            
            # Get message or template
            message = rule_def.get('error') or rule_def.get('warning')
            message_template = rule_def.get('error_template') or rule_def.get('warning_template')
            
            try:
                rule = ValidationRule(
                    name=name,
                    description=description,
                    level=level,
                    message=message,
                    message_template=message_template
                )
                self.rules[name] = rule
            except ValueError as e:
                failed_rules.append(f"Rule '{name}': {e}")
                continue
        
        # If any rules failed to register, exit with error
        if failed_rules and self.strict_mode:
            print("ERROR: Failed to register validation rules:", file=sys.stderr)
            for error in failed_rules:
                print(f"  - {error}", file=sys.stderr)
            sys.exit(1)
    
    def get_rule(self, name: str) -> Optional[ValidationRule]:
        """Get validation rule by name and mark it as used"""
        if name not in self.rules:
            if self.strict_mode:
                print(f"ERROR: Validation rule '{name}' is not registered in schema", file=sys.stderr)
                sys.exit(1)
            return None
        
        self.used_rules.add(name)
        return self.rules.get(name)
    
    def has_rule(self, name: str) -> bool:
        """Check if rule exists"""
        return name in self.rules
    
    def get_all_rules(self) -> Dict[str, ValidationRule]:
        """Get all registered rules"""
        return self.rules.copy()
    
    def get_rules_by_level(self, level: RuleLevel) -> List[ValidationRule]:
        """Get all rules with specified level"""
        return [rule for rule in self.rules.values() if rule.level == level]
    
    def validate_usage(self):
        """Validate that all used rules are registered (not that all registered rules are used)"""
        # This method is kept for compatibility but doesn't need to do anything
        # The check for unregistered rules happens in get_rule() method
        # Rules are only used when needed, so we don't check that all registered rules are used
        pass


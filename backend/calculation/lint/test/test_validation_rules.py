"""Tests for validation rules registry and schema validation"""

import pytest
import yaml
from pathlib import Path
from backend.calculation.lint.validation_rules import ValidationRulesRegistry, ValidationRule, RuleLevel


class TestValidationRulesRegistry:
    """Test validation rules registry"""
    
    def test_load_rules(self, schema_path):
        """Test that rules are loaded from schema"""
        registry = ValidationRulesRegistry(schema_path)
        rules = registry.get_all_rules()
        
        assert len(rules) > 0, "Should load at least one rule"
        assert "redundant_or_warning" in rules, "Should have redundant_or_warning rule"
        assert "reference_must_exist" in rules, "Should have reference_must_exist rule"
    
    def test_get_rule(self, schema_path):
        """Test getting a specific rule"""
        registry = ValidationRulesRegistry(schema_path)
        rule = registry.get_rule("redundant_or_warning")
        
        assert rule is not None, "Should find redundant_or_warning rule"
        assert rule.name == "redundant_or_warning"
        assert rule.level == RuleLevel.WARNING
        assert rule.message is not None, "Should have message"
    
    def test_get_nonexistent_rule(self, schema_path):
        """Test getting a non-existent rule"""
        # Use strict_mode=False for this test to avoid exit(1)
        registry = ValidationRulesRegistry(schema_path, strict_mode=False)
        rule = registry.get_rule("nonexistent_rule")
        
        assert rule is None, "Should return None for non-existent rule"
    
    def test_rule_with_template(self, schema_path):
        """Test rule with message template"""
        registry = ValidationRulesRegistry(schema_path)
        rule = registry.get_rule("reference_must_exist")
        
        assert rule is not None, "Should find reference_must_exist rule"
        assert rule.message_template is not None, "Should have message template"
        
        # Test template formatting
        message = rule.get_message(
            reference_type="argument",
            name="testArg",
            section="arguments"
        )
        assert "argument" in message
        assert "testArg" in message
        assert "arguments" in message
    
    def test_get_rules_by_level(self, schema_path):
        """Test getting rules by level"""
        registry = ValidationRulesRegistry(schema_path)
        error_rules = registry.get_rules_by_level(RuleLevel.ERROR)
        warning_rules = registry.get_rules_by_level(RuleLevel.WARNING)
        
        assert len(error_rules) > 0, "Should have error rules"
        assert len(warning_rules) > 0, "Should have warning rules"
        
        # All error rules should be ERROR level
        assert all(rule.level == RuleLevel.ERROR for rule in error_rules)
        # All warning rules should be WARNING level
        assert all(rule.level == RuleLevel.WARNING for rule in warning_rules)


class TestValidationRulesSchema:
    """Test validation rules schema structure"""
    
    def test_schema_has_validation_rules(self, schema_path):
        """Test that schema file has validation_rules section"""
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = yaml.safe_load(f)
        
        assert 'validation_rules' in schema, "Schema should have validation_rules section"
        assert isinstance(schema['validation_rules'], list), "validation_rules should be a list"
        assert len(schema['validation_rules']) > 0, "Should have at least one validation rule"
    
    def test_rule_structure(self, schema_path):
        """Test that each rule has required fields"""
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = yaml.safe_load(f)
        
        rules = schema.get('validation_rules', [])
        for rule in rules:
            assert 'name' in rule, f"Rule should have 'name' field: {rule}"
            assert 'description' in rule, f"Rule should have 'description' field: {rule}"
            assert 'level' in rule, f"Rule should have 'level' field: {rule}"
            assert rule['level'] in ['error', 'warning'], f"Rule level should be 'error' or 'warning': {rule}"
            
            # Should have either 'error'/'warning' or 'error_template'/'warning_template'
            has_message = 'error' in rule or 'warning' in rule
            has_template = 'error_template' in rule or 'warning_template' in rule
            assert has_message or has_template, f"Rule should have message or template: {rule}"
    
    def test_rule_levels_match_messages(self, schema_path):
        """Test that rule levels match message types"""
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = yaml.safe_load(f)
        
        rules = schema.get('validation_rules', [])
        for rule in rules:
            level = rule.get('level', '').lower()
            has_error = 'error' in rule or 'error_template' in rule
            has_warning = 'warning' in rule or 'warning_template' in rule
            
            if level == 'error':
                assert has_error, f"Error rule should have 'error' or 'error_template': {rule}"
            elif level == 'warning':
                assert has_warning, f"Warning rule should have 'warning' or 'warning_template': {rule}"


class TestValidationRulesImplementation:
    """Test that all rules in schema are implemented"""
    
    def test_all_rules_have_implementation(self, schema_path):
        """Test that all rules in schema can be loaded"""
        registry = ValidationRulesRegistry(schema_path)
        
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = yaml.safe_load(f)
        
        schema_rules = {rule['name'] for rule in schema.get('validation_rules', [])}
        loaded_rules = set(registry.get_all_rules().keys())
        
        # All schema rules should be loaded
        missing_rules = schema_rules - loaded_rules
        assert len(missing_rules) == 0, f"Rules in schema but not loaded: {missing_rules}"
        
        # All loaded rules should be in schema
        extra_rules = loaded_rules - schema_rules
        assert len(extra_rules) == 0, f"Rules loaded but not in schema: {extra_rules}"
    
    def test_rule_names_are_unique(self, schema_path):
        """Test that rule names are unique in schema"""
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = yaml.safe_load(f)
        
        rules = schema.get('validation_rules', [])
        rule_names = [rule['name'] for rule in rules]
        unique_names = set(rule_names)
        
        assert len(rule_names) == len(unique_names), f"Rule names should be unique. Duplicates: {[name for name in rule_names if rule_names.count(name) > 1]}"


class TestValidationRulesUsage:
    """Test that rules are used correctly in validators"""
    
    def test_conditions_validator_uses_rules(self, schema_path, temp_manifest_file):
        """Test that ConditionsValidator uses rules from registry"""
        from backend.calculation.lint.manifest_validator import ManifestValidator
        
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
  outputLayers:
    - id: output1
      label: Output 1
      description: Test output
      required: true
"""
        with temp_manifest_file(manifest_content) as manifest_path:
            validator = ManifestValidator(manifest_path, schema_path)
            result = validator.validate()
            
            # Should have warning about redundant or
            warning_messages = [w.message for w in validator.warnings]
            # Check that warning message matches rule
            registry = ValidationRulesRegistry(schema_path)
            rule = registry.get_rule("redundant_or_warning")
            assert rule is not None
            assert any(rule.message in msg for msg in warning_messages), \
                f"Should have warning matching rule message. Warnings: {warning_messages}, Rule message: {rule.message}"


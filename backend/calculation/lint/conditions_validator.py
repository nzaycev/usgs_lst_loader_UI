"""
Валидатор условий (conditions) в манифесте.
"""

import re
from typing import Any, Optional, Set, List, Tuple
from .issue import Issue
from .line_finder import LineFinder
from .validation_rules import ValidationRulesRegistry, RuleLevel


class ConditionsValidator:
    """Валидатор условий conditions"""
    
    def __init__(self, line_finder: LineFinder, argument_names: Set[str], 
                 input_layer_ids: Set[str], output_layer_ids: Set[str],
                 manifest_lines: List[str],
                 rules_registry: Optional[ValidationRulesRegistry] = None):
        self.line_finder = line_finder
        self.argument_names = argument_names
        self.input_layer_ids = input_layer_ids
        self.output_layer_ids = output_layer_ids
        self.manifest_lines = manifest_lines
        self.rules_registry = rules_registry or ValidationRulesRegistry()
        self.errors: List[Issue] = []
        self.warnings: List[Issue] = []
    
    def validate(self, conditions: Any, path: str, parent_value: Any = None) -> Tuple[List[Issue], List[Issue]]:
        """
        Валидация условий (conditions).
        
        Returns:
            tuple: (errors, warnings)
        """
        # Сохраняем текущие ошибки и предупреждения
        old_error_count = len(self.errors)
        old_warning_count = len(self.warnings)
        
        if conditions is None:
            return [], []
        
        # If conditions is a list (top-level array) - this is handled by OpenAPI schema
        if isinstance(conditions, list):
            conditions_line = self.line_finder.find_line_for_path(path)
            if len(conditions) == 0:
                self.warning("empty_conditions_list", path, value=parent_value, line=conditions_line)
            # Top-level array validation is handled by OpenAPI schema
            new_errors = self.errors[old_error_count:]
            new_warnings = self.warnings[old_warning_count:]
            return new_errors, new_warnings
        
        # Если conditions - словарь
        if isinstance(conditions, dict):
            self._validate_conditions_dict(conditions, path, parent_value)
        
        # Возвращаем только новые ошибки и предупреждения
        new_errors = self.errors[old_error_count:]
        new_warnings = self.warnings[old_warning_count:]
        
        return new_errors, new_warnings
    
    def _validate_conditions_dict(self, conditions: dict, path: str, parent_value: Any):
        """Валидация словаря conditions"""
        # Проверяем известные операторы
        known_operators = {'or', 'and', 'not', 'equal', 'true', 'false'}
        operators = set(conditions.keys())
        # Обрабатываем случай, когда ключ - это булево True (из YAML)
        if True in operators:
            operators.remove(True)
            operators.add('true')
        unknown_ops = operators - known_operators
        
        # Unknown operators are validated by OpenAPI schema
        # Skip 'value' if it's part of 'equal' operator
        for op in unknown_ops:
            # Skip 'value' if 'equal' is present (new format: equal: ref, value: literal)
            if op == 'value' and 'equal' in conditions:
                continue
            # If it's a string reference, validate it
            if isinstance(conditions[op], str) and (
                conditions[op].startswith('args.') or 
                conditions[op].startswith('inputs.') or 
                conditions[op].startswith('outputs.')
            ):
                self._validate_reference(conditions[op], f"{path}.{op}", parent_value)
        
        # Проверка оператора 'or'
        if 'or' in conditions:
            self._validate_or_operator(conditions['or'], path, parent_value)
        
        # Проверка оператора 'and'
        if 'and' in conditions:
            self._validate_and_operator(conditions['and'], path, parent_value)
        
        # Проверка оператора 'not'
        if 'not' in conditions:
            self._validate_not_operator(conditions['not'], path, parent_value)
        
        # Проверка оператора 'equal'
        # Format: equal: args.arg1, value: something
        if 'equal' in conditions:
            self._validate_equal_operator(conditions, f"{path}", parent_value)
        
        # Note: 'true' operator validation is handled by OpenAPI schema validation
        # No custom validation needed
        
        # Check string values (may be references)
        # Skip known operators and 'value' (which is part of 'equal' operator)
        known_operators = {'or', 'and', 'not', 'equal', 'true', 'false', 'value'}
        for key, value in conditions.items():
            # Skip 'value' if it's part of 'equal' operator
            if key == 'value' and 'equal' in conditions:
                continue
            if key in known_operators:
                continue
            if isinstance(value, str):
                self._validate_reference(value, f"{path}.{key}", parent_value)
            # Unknown operators are validated by OpenAPI schema
    
    def _validate_or_operator(self, or_value: Any, path: str, parent_value: Any):
        """Валидация оператора 'or'"""
        # Type validation is handled by OpenAPI schema
        if not isinstance(or_value, list):
            return
        
        if len(or_value) == 0:
            self.warning("empty_or_list", path, value=parent_value)
        elif len(or_value) == 1:
            # Redundant or with single element
            or_line = self.line_finder.find_line_for_path(path)
            self.warning("redundant_or_warning", path, value=parent_value, line=or_line)
        
        # Валидируем каждый элемент списка
        for i, item in enumerate(or_value):
            # Если элемент - строка, это ссылка, валидируем её
            if isinstance(item, str):
                # Используем path-based поиск
                ref_line = self.line_finder.find_line_for_path(f"{path}.or.{i}")
                self._validate_reference(item, f"{path}.or.{i}", parent_value, line=ref_line)
            # Если элемент - словарь, это вложенное условие
            elif isinstance(item, dict):
                # Проверяем, что это валидная структура conditions
                # Должен быть хотя бы один оператор: or, and, not, equal
                valid_operators = {'or', 'and', 'not', 'equal', 'true', 'false'}
                keys = set(item.keys())
                has_operator = bool(keys & valid_operators)
                
                # Если нет операторов, но есть ключи - это может быть ошибка
                if not has_operator and len(keys) > 0:
                    # Проверяем, не являются ли ключи ссылками
                    all_refs = all(
                        isinstance(item[k], str) and 
                        item[k].startswith(('args.', 'inputs.', 'outputs.'))
                        for k in keys
                    )
                    # Structure validation is handled by OpenAPI schema
                    if not all_refs:
                        continue
                
                # Валидируем вложенное условие
                nested_errors, nested_warnings = self.validate(item, f"{path}.or.{i}", item)
                # Ошибки уже добавлены в self.errors и self.warnings внутри validate
            else:
                # Type validation is handled by OpenAPI schema
                pass
    
    def _validate_and_operator(self, and_value: Any, path: str, parent_value: Any):
        """Валидация оператора 'and'"""
        # Type validation is handled by OpenAPI schema
        if not isinstance(and_value, list):
            return
        
        if len(and_value) == 0:
            self.warning("empty_and_list", path, value=parent_value)
            return
        elif len(and_value) == 1:
            # Redundant and with single element
            and_line = self.line_finder.find_line_for_path(path)
            self.warning("redundant_and_warning", path, value=parent_value, line=and_line)
        
        # Валидируем каждый элемент списка
        for i, item in enumerate(and_value):
            self.validate(item, f"{path}.and.{i}", item)
    
    def _validate_not_operator(self, not_value: Any, path: str, parent_value: Any):
        """Validate 'not' operator"""
        # Type validation is handled by OpenAPI schema
        # not can be a string (reference) or dict (nested condition)
        if isinstance(not_value, str):
            ref_line = self.line_finder.find_line_for_path(path)
            self._validate_reference(not_value, path, parent_value, line=ref_line)
        elif isinstance(not_value, dict):
            # Nested condition - validate it
            nested_errors, nested_warnings = self.validate(not_value, f"{path}.not", not_value)
            # Errors are already added in self.errors and self.warnings within validate
    
    def _validate_equal_operator(self, equal_dict: dict, path: str, parent_value: Any):
        """Validate 'equal' operator: equal: reference, value: literal"""
        # Structure validation (required fields, types) is handled by OpenAPI schema
        # Only validate that 'equal' field is a valid reference
        if 'equal' in equal_dict:
            equal_ref = equal_dict['equal']
            if isinstance(equal_ref, str) and equal_ref.startswith(('args.', 'inputs.', 'outputs.')):
                ref_line = self.line_finder.find_line_for_path(f"{path}.equal")
                self._validate_reference(equal_ref, f"{path}.equal", parent_value, line=ref_line)
    
    def _validate_reference(self, ref: str, path: str, parent_value: Any, line: Optional[int] = None):
        """Валидация ссылки (args.*, inputs.*, outputs.*)"""
        if not isinstance(ref, str):
            return
        
        # Находим строку с этой ссылкой используя path
        if line is None:
            line = self.line_finder.find_line_for_path(path)
        
        if ref.startswith('args.'):
            arg_name = ref[5:]  # remove 'args.'
            if arg_name not in self.argument_names:
                self.error(
                    "reference_must_exist",
                    path,
                    value=parent_value,
                    line=line,
                    reference_type="argument",
                    name=arg_name,
                    section="arguments"
                )
        elif ref.startswith('inputs.'):
            input_name = ref[7:]  # remove 'inputs.'
            if input_name not in self.input_layer_ids:
                self.error(
                    "reference_must_exist",
                    path,
                    value=parent_value,
                    line=line,
                    reference_type="input layer",
                    name=input_name,
                    section="inputLayers"
                )
        elif ref.startswith('outputs.'):
            output_name = ref[8:]  # remove 'outputs.'
            if output_name not in self.output_layer_ids:
                self.error(
                    "reference_must_exist",
                    path,
                    value=parent_value,
                    line=line,
                    reference_type="output layer",
                    name=output_name,
                    section="outputLayers"
                )
        elif ref.startswith('arg.'):
            # Typo: should be args.*
            self.error(
                "invalid_reference_format",
                path,
                value=parent_value,
                line=line,
                ref=ref,
                name=ref[4:]
            )
        elif '.' in ref and not ref.startswith(('args.', 'inputs.', 'outputs.')):
            # Unknown reference format
            self.warning(
                "unknown_reference_format",
                path,
                value=parent_value,
                line=line,
                ref=ref
            )
    
    
    def _add_issue(self, rule_name: str, path: str, value: Any = None, 
                   line: Optional[int] = None, **template_kwargs):
        """Add issue using validation rule"""
        rule = self.rules_registry.get_rule(rule_name)
        if not rule:
            raise ValueError(f"Validation rule '{rule_name}' not found in registry")
        
        if line is None:
            line = self.line_finder.find_line_for_path(path)
        
        message = rule.get_message(**template_kwargs)
        issue = Issue(
            message=message,
            path=path,
            line=line,
            is_error=(rule.level == RuleLevel.ERROR)
        )
        
        if rule.level == RuleLevel.ERROR:
            self.errors.append(issue)
        else:
            self.warnings.append(issue)
    
    def error(self, rule_name: str, path: str, value: Any = None, 
              line: Optional[int] = None, **template_kwargs):
        """Add error using validation rule"""
        self._add_issue(rule_name, path, value, line, **template_kwargs)
    
    def warning(self, rule_name: str, path: str, value: Any = None, 
                line: Optional[int] = None, **template_kwargs):
        """Add warning using validation rule"""
        self._add_issue(rule_name, path, value, line, **template_kwargs)


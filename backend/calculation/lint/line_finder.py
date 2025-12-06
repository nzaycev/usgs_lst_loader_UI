"""
Utilities for finding line numbers in YAML files using path-based recursive search.
"""

from typing import Any, Optional, List, Tuple


class LineFinder:
    """Class for finding line numbers in YAML file using recursive path-based search"""
    
    def __init__(self, manifest_lines: List[str]):
        self.manifest_lines = manifest_lines
    
    def find_line_for_path(self, path: str, value: Any = None) -> Optional[int]:
        """
        Find line number for given YAML path.
        
        Args:
            path: YAML path like "module.inputLayers.0.conditions.or.0" (numeric segments are array indices)
            value: Optional value for validation (not used in path-based search)
        
        Returns:
            Line number (1-based) or None if not found
        """
        if not path or not path.strip():
            return None
        
        parts = self._parse_path(path)
        if not parts:
            return None
        
        return self._find_path_recursive(parts, 0, len(self.manifest_lines), 0)
    
    def _parse_path(self, path: str) -> List[Tuple[str, Optional[int]]]:
        """
        Parse path string into list of (key, index) tuples.
        
        Examples:
            "module.inputLayers.0.conditions" -> [("module", None), ("inputLayers", None), ("", 0), ("conditions", None)]
            "module.arguments.1.name" -> [("module", None), ("arguments", None), ("", 1), ("name", None)]
        """
        parts = []
        for segment in path.split('.'):
            if not segment:
                continue
            try:
                index = int(segment)
                parts.append(("", index))
            except ValueError:
                parts.append((segment, None))
        return parts
    
    def _find_path_recursive(self, parts: List[Tuple[str, Optional[int]]], 
                            start_line: int, end_line: int, 
                            expected_indent: int) -> Optional[int]:
        """
        Recursively find path component in YAML file.
        
        Args:
            parts: List of (key, index) tuples to find
            start_line: Start line index (0-based, inclusive)
            end_line: End line index (0-based, exclusive)
            expected_indent: Expected indentation level (number of spaces)
        
        Returns:
            Line number (1-based) or None if not found
        """
        if not parts:
            return start_line + 1 if start_line < len(self.manifest_lines) else None
        
        key, index = parts[0]
        remaining_parts = parts[1:]
        
        # Find current component
        found_line, found_end = self._find_component(key, index, start_line, end_line, expected_indent)
        if found_line is None:
            return None
        
        # If this is the last component, return its line
        if not remaining_parts:
            return found_line + 1
        
        # Handle special case: array element with key-value pair (e.g., "- not:")
        if index is not None:
            found_line_content = self.manifest_lines[found_line]
            if ':' in found_line_content and found_line_content.strip().startswith('-'):
                stripped = found_line_content.strip()
                line_key = stripped.split(':')[0].strip()[1:].strip()  # Remove '-' and get key
                
                # If next component is the same key, skip it and search inside
                if remaining_parts and remaining_parts[0][0] == line_key:
                    remaining_parts = remaining_parts[1:]
                    if not remaining_parts:
                        return found_line + 1
                    
                    # Search inside the key's content
                    after_colon = stripped.split(':', 1)[1].strip()
                    search_start = found_line if after_colon else found_line + 1
                    indent_step = self._get_indent_step(search_start, found_end, expected_indent)
                    next_indent = expected_indent + indent_step
                    return self._find_path_recursive(remaining_parts, search_start, found_end, next_indent)
        
        # Default: search in the section after found component
        indent_step = self._get_indent_step(found_line + 1, found_end, expected_indent)
        next_indent = expected_indent + indent_step
        return self._find_path_recursive(remaining_parts, found_line + 1, found_end, next_indent)
    
    def _find_component(self, key: str, index: Optional[int], 
                       start_line: int, end_line: int, 
                       expected_indent: int) -> Tuple[Optional[int], int]:
        """
        Find a single path component (key or array element) in YAML.
        
        Returns:
            Tuple of (found_line (0-based), section_end_line (0-based, exclusive))
            or (None, end_line) if not found
        """
        array_counter = -1
        
        for i in range(start_line, min(end_line, len(self.manifest_lines))):
            line = self.manifest_lines[i]
            stripped = line.strip()
            
            if not stripped:
                continue
            
            actual_indent = len(line) - len(line.lstrip())
            
            # Left the section
            if actual_indent < expected_indent:
                return None, i
            
            # Match at expected indentation
            if actual_indent == expected_indent:
                if index is not None:
                    # Looking for array element
                    if stripped.startswith('-'):
                        array_counter += 1
                        if array_counter == index:
                            return i, self._find_section_end(i, expected_indent, end_line)
                else:
                    # Looking for key
                    if ':' in stripped:
                        line_key = stripped.split(':')[0].strip()
                        if line_key.startswith('-'):
                            line_key = line_key[1:].strip()
                        if line_key == key:
                            return i, self._find_section_end(i, expected_indent, end_line)
        
        return None, end_line
    
    def _find_section_end(self, start_line: int, section_indent: int, max_line: int) -> int:
        """
        Find the end of a YAML section (where next element at same or less indentation starts).
        """
        for i in range(start_line + 1, min(max_line, len(self.manifest_lines))):
            line = self.manifest_lines[i]
            stripped = line.strip()
            
            if not stripped or stripped.startswith('#'):
                continue
            
            actual_indent = len(line) - len(line.lstrip())
            
            if actual_indent <= section_indent:
                if stripped.startswith('-') or ':' in stripped:
                    return i
        
        return min(max_line, len(self.manifest_lines))
    
    def _get_indent_step(self, start_line: int, end_line: int, parent_indent: int) -> int:
        """
        Get the indent step (minimum indent difference) in a YAML section.
        
        Returns the difference between parent indent and minimum child indent,
        or 2 if no children found.
        """
        min_child_indent = None
        
        for i in range(start_line, min(end_line, len(self.manifest_lines))):
            line = self.manifest_lines[i]
            stripped = line.strip()
            
            if not stripped or stripped.startswith('#'):
                continue
            
            actual_indent = len(line) - len(line.lstrip())
            
            if actual_indent > parent_indent:
                if min_child_indent is None or actual_indent < min_child_indent:
                    min_child_indent = actual_indent
        
        return (min_child_indent - parent_indent) if min_child_indent is not None else 2

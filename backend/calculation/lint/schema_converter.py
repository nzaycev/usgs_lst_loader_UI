"""
Converter from OpenAPI schema format to JSON Schema for jsonschema validation.
"""

import yaml
from pathlib import Path
from typing import Dict, Any, Optional


class SchemaConverter:
    """Convert OpenAPI schema to JSON Schema format"""
    
    def __init__(self, schema_path: Optional[str] = None):
        if schema_path is None:
            schema_path = Path(__file__).parent / "manifest_schema.yml"
        
        self.schema_path = Path(schema_path)
        self.openapi_schema: Dict[str, Any] = {}
        self.json_schema: Dict[str, Any] = {}
        self.load()
        self.convert()
    
    def load(self):
        """Load OpenAPI schema from YAML file"""
        try:
            with open(self.schema_path, 'r', encoding='utf-8') as f:
                self.openapi_schema = yaml.safe_load(f)
        except Exception as e:
            raise ValueError(f"Failed to load schema from {self.schema_path}: {e}")
    
    def convert(self):
        """Convert OpenAPI schema to JSON Schema format"""
        if 'components' not in self.openapi_schema or 'schemas' not in self.openapi_schema['components']:
            raise ValueError("OpenAPI schema must contain 'components.schemas'")
        
        schemas = self.openapi_schema['components']['schemas']
        
        # Create JSON Schema with $ref resolver
        # The root schema is Manifest
        manifest_module_schema = schemas.get("ManifestModule", {})
        
        self.json_schema = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "properties": {
                "module": self._convert_schema(schemas, manifest_module_schema)
            },
            "required": ["module"],
            "additionalProperties": False,
            "definitions": {}
        }
        
        # Convert all schemas to definitions
        for schema_name, schema_def in schemas.items():
            self.json_schema["definitions"][schema_name] = self._convert_schema(schemas, schema_def)
    
    def _convert_schema(self, all_schemas: Dict[str, Any], schema: Dict[str, Any]) -> Dict[str, Any]:
        """Convert a single schema definition"""
        if "$ref" in schema:
            # Resolve reference
            ref_path = schema["$ref"]
            if ref_path.startswith("#/components/schemas/"):
                schema_name = ref_path.split("/")[-1]
                return {"$ref": f"#/definitions/{schema_name}"}
            return schema
        
        result: Dict[str, Any] = {}
        
        # Copy type
        if "type" in schema:
            result["type"] = schema["type"]
        
        # Copy additionalProperties
        if "additionalProperties" in schema:
            result["additionalProperties"] = schema["additionalProperties"]
        
        # Convert properties
        if "properties" in schema:
            result["properties"] = {}
            for prop_name, prop_def in schema["properties"].items():
                result["properties"][prop_name] = self._convert_schema(all_schemas, prop_def)
        
        # Copy required fields
        if "required" in schema:
            result["required"] = schema["required"]
        
        # Convert items (for arrays)
        if "items" in schema:
            result["items"] = self._convert_schema(all_schemas, schema["items"])
        
        # Convert anyOf
        if "anyOf" in schema:
            result["anyOf"] = [
                self._convert_schema(all_schemas, item)
                for item in schema["anyOf"]
            ]
        
        # Copy const
        if "const" in schema:
            result["const"] = schema["const"]
        
        return result
    
    def _convert_schema_ref(self, all_schemas: Dict[str, Any], ref_path: str) -> Dict[str, Any]:
        """Convert a schema reference"""
        if ref_path.startswith("#/components/schemas/"):
            schema_name = ref_path.split("/")[-1]
            return {"$ref": f"#/definitions/{schema_name}"}
        return {"$ref": ref_path}
    
    def get_json_schema(self) -> Dict[str, Any]:
        """Get the converted JSON Schema"""
        return self.json_schema


EXTRA_FIELDS_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "extra_fields",
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "name": {
                "type": "string"
            },
            "value": {
                "oneOf": [
                    {"type": "string"},
                    {"type": "boolean"},
                    {"type": "number"},
                    {"type": "null"},
                    {"$ref": "#/definitions/obj_list"}
                ]
            }
        },
        "required": ["name", "value"]
    },
    "definitions": {
        "obj_list": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "label": {
                        "type": "string"
                    },
                    "value": {
                        "type": [
                            "string",
                            "boolean",
                            "number",
                            "null",
                            "object"
                        ]
                    }
                },
                "required": [
                    "label",
                    "value"
                ]
            }
        }
    }
}

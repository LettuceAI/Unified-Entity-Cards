# Unified Entity Card Python Library

Lightweight helpers for creating and validating Unified Entity Cards.

pypi: https://pypi.org/project/unified-entity-card/0.1.1/

## Usage

```python
from uec import create_character_uec, validate_uec

card = create_character_uec({
  "id": "4c5d8e2a-7a7f-4cda-9f68-6a2b6f4f4f2f",
  "name": "Aster Vale",
  "description": "A methodical archivist who values evidence over rumor."
})

result = validate_uec(card, strict=True)
if not result.ok:
  print(result.errors)
```

`app_specific_settings` is treated as an opaque object. Validation focuses on schema, kind, and payload structure.

If `systemPrompt` is a template ID, pass `system_prompt_is_id=True` to `create_character_uec`. It will store the prompt as `_ID:<id>`.

# Unified Entity Card Python Library

Lightweight helpers for creating, converting, validating, and tooling Unified Entity Cards (v1 and v2).

PyPI: https://pypi.org/project/unified-entity-card/

## Usage

```python
from uec import create_character_uec_v2, validate_uec, convert_uec_v1_to_v2

v2 = create_character_uec_v2({
    "id": "char-v2-1",
    "name": "Aster Vale",
})

result = validate_uec(v2, strict=False)
print(result.ok)

v1 = {
    "schema": {"name": "UEC", "version": "1.0"},
    "kind": "character",
    "payload": {"id": "char-1", "name": "Aster"},
}

upgraded = convert_uec_v1_to_v2(v1)
```

## Highlights

- Supports schema versions `1.0` and `2.0`
- Version-aware validation
- v1 -> v2 conversion helper
- Parsing, normalization, and stable stringification
- Upgrade/downgrade helpers
- Diff and merge helpers
- Asset extraction/rewriting helpers
- Lint-style quality checks

## Main API

- `create_uec`, `create_character_uec`, `create_persona_uec`
- `create_character_uec_v2`, `create_persona_uec_v2`
- `validate_uec`, `validate_uec_strict`, `validate_uec_at_version`
- `convert_uec_v1_to_v2`, `upgrade_uec`, `downgrade_uec`
- `parse_uec`, `normalize_uec`, `stringify_uec`
- `diff_uec`, `merge_uec`
- `extract_assets`, `rewrite_assets`, `lint_uec`

## Tests

```bash
cd python && python -m unittest discover -s tests -v
```

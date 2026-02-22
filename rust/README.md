# Unified Entity Card Rust Library

Lightweight helpers for creating, converting, validating, and tooling Unified Entity Cards (v1 and v2) with `serde_json::Value`.

crates.io: https://crates.io/crates/unified-entity-card

## Usage

```rust
use serde_json::{json, Map, Value};
use unified_entity_card::{
    create_character_uec_v2,
    validate_uec,
    convert_uec_v1_to_v2,
    lint_uec,
};

let mut payload = Map::new();
payload.insert("id".to_string(), Value::String("char-v2-1".to_string()));
payload.insert("name".to_string(), Value::String("Aster Vale".to_string()));

let v2 = create_character_uec_v2(payload, None, None, None, None);
let validation = validate_uec(&v2, false);
assert!(validation.ok);

let v1 = json!({
  "schema": { "name": "UEC", "version": "1.0" },
  "kind": "character",
  "payload": { "id": "char-1", "name": "Aster" }
});

let upgraded = convert_uec_v1_to_v2(&v1).expect("must convert");
assert_eq!(
    upgraded["schema"]["version"].as_str(),
    Some("2.0")
);

let lint = lint_uec(&upgraded);
println!("warnings: {:?}", lint.warnings);
```

## Highlights

- Supports schema `1.0` and `2.0`
- Version-aware validation
- v1 -> v2 conversion helper
- Helpers for parsing, normalizing, stringifying, diffing, merging, assets, and linting

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
cd rust && cargo test
```

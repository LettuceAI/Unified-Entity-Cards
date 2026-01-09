# Unified Entity Card Rust Library

Lightweight helpers for validating Unified Entity Cards with `serde_json::Value`.

crates.io: https://crates.io/crates/unified-entity-card

## Usage

```rust
use serde_json::json;
use unified_entity_card::{assert_uec, validate_uec};

let card = json!({
  "schema": { "name": "UEC", "version": "1.0" },
  "kind": "character",
  "payload": {
    "id": "4c5d8e2a-7a7f-4cda-9f68-6a2b6f4f4f2f",
    "name": "Aster Vale"
  },
  "app_specific_settings": {},
  "meta": {},
  "extensions": {}
});

let result = validate_uec(&card, true);
if !result.ok {
  eprintln!("{:?}", result.errors);
}

assert_uec(&card, false).expect("card is invalid");
```

`app_specific_settings` is treated as an opaque object. Validation focuses on schema, kind, and payload structure.

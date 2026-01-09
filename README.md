# Unified Entity Card (UEC)

Links: npm https://www.npmjs.com/package/unified-entity-card | PyPI https://pypi.org/project/unified-entity-card/0.1.1/ | crates.io https://crates.io/crates/unified-entity-card

[![npm version](https://img.shields.io/npm/v/unified-entity-card.svg)](https://www.npmjs.com/package/unified-entity-card)
[![PyPI version](https://img.shields.io/pypi/v/unified-entity-card.svg)](https://pypi.org/project/unified-entity-card/0.1.0/)
[![crates.io](https://img.shields.io/crates/v/unified-entity-card.svg)](https://crates.io/crates/unified-entity-card)
[![MIT license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Mission: make character and persona cards portable, stable, and easy to share across tools without losing fidelity.

Unified Entity Card (UEC) is a portable JSON container that can represent either a Character or a Persona. The format is designed for interoperability: tools that only support one entity type can still parse the file safely, and tools that support both can round-trip without special casing.

## Goals

- Single file format for characters and personas.
- Backward-friendly evolution via explicit schema versioning.
- Clear separation of canonical data from app-specific presentation data.
- Safe extension surface for vendor-specific fields.

## File structure

```json
{
  "schema": { "name": "UEC", "version": "1.0" },
  "kind": "character",
  "payload": {},
  "app_specific_settings": {},
  "meta": {},
  "extensions": {}
}
```

### `schema`
Global identity and versioning.

- `name`: fixed identifier, currently `"UEC"`.
- `version`: schema version string.
- `compat` (optional): minimum compatible version.

### `kind`
Discriminated union.

- `"character"` -> `payload` matches `CharacterSchema`.
- `"persona"` -> `payload` matches `PersonaSchema`.

### `payload`
Canonical data, mapped 1:1 to existing schemas.

Character payload typically includes:
- identity and description fields
- `definitions` (LLM-facing explanation)
- `tags` (search/grouping)
- `avatar` (base64 data URI or https URL)
- `chatBackground` (base64 data URI or https URL)
- `systemPrompt` (prompt text, or `_ID:<id>` to reference a template)
- rules, scenes, and voice configuration

Scene variants, when present, use objects with `id`, `content`, and `createdAt` fields (additional fields are allowed).

Persona payload typically includes:
- title, description, `avatar` (base64 data URI or https URL), and default flag

### `app_specific_settings`
Opaque object reserved for UI/app defaults. Consumers should treat this as optional and non-canonical. Validation only checks that it is an object if present.

### `meta`
Provenance and lifecycle metadata (created/updated timestamps, source, authors, license).

### `extensions`
Open object for vendor-specific fields. Namespace keys (e.g. `"com.vendor.product"`) to avoid collisions.

## Examples

- Character: `examples/character.uec`
- Persona: `examples/persona.uec`

## Libraries

This repo includes lightweight helpers for JS/TS, Python, and Rust.

JS/TS (`js/`):

```js
import { createCharacterUEC, validateUEC } from "./js/src/index.js";

const card = createCharacterUEC({
  id: "4c5d8e2a-7a7f-4cda-9f68-6a2b6f4f4f2f",
  name: "Aster Vale",
  description: "A methodical archivist who values evidence over rumor."
});

const result = validateUEC(card, { strict: true });
if (!result.ok) {
  console.error(result.errors);
}
```

Python (`python/`):

```python
from uec import create_character_uec, validate_uec

card = create_character_uec({
  "id": "4c5d8e2a-7a7f-4cda-9f68-6a2b6f4f4f2f",
  "name": "Aster Vale"
})

result = validate_uec(card, strict=True)
if not result.ok:
  print(result.errors)
```

Rust (`rust/`):

```rust
use serde_json::json;
use unified_entity_card::validate_uec;

let card = json!({
  "schema": { "name": "UEC", "version": "1.0" },
  "kind": "persona",
  "payload": { "id": "7b3c1a6f-9c2a-4b0e-8ad3-2e8f4d2c9a61", "title": "Pragmatic Analyst" }
});

let result = validate_uec(&card, true);
assert!(result.ok);
```

Language-specific READMEs live in `js/README.md`, `python/README.md`, and `rust/README.md`.

## File extension recommendation

Use `.uec` to signal a Unified Entity Card while keeping JSON content.

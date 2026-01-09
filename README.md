# Unified Entity Card (UEC) Proposal

This repo proposes a single, portable JSON format for representing either a Character or a Persona. The goal is cross-platform interoperability: platforms that only understand one entity type can still read the file safely, while platforms that understand both can support sharing, export, and import without special casing.

## Summary

The Unified Entity Card (UEC) is a single JSON file with these top-level fields:

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

- `schema` identifies the file type and version.
- `kind` declares whether the payload is a character or persona.
- `payload` maps 1:1 with existing schemas.
- `app_specific_settings` holds presentation-only UI preferences.
- `meta` tracks provenance and lifecycle.
- `extensions` allows vendor-specific data.

## Detailed rationale

### 1) `schema`: global identity + versioning
The `schema` object tells any consumer exactly what it is parsing.

- `name`: fixed identifier for the file type, for example `"UEC"`.
- `version`: the current schema version.
- `compat` (optional): minimum compatible version for safe parsing.

This enables explicit version checks and safe forward compatibility.

### 2) `kind`: discriminated union
`kind` explicitly declares what the payload represents.

- `"character"` means the payload matches `CharacterSchema`.
- `"persona"` means the payload matches `PersonaSchema`.

This avoids ambiguity while keeping the file universal.

### 3) `payload`: the canonical data
`payload` stays 1:1 with existing schemas, so there is no loss of fidelity.

- Character payload includes identity, behavior, definitions, tags, scenes, and voice settings.
- Persona payload includes title, description, avatar, and default flag.

This preserves current data models while enabling export/import in a unified format.

Character-specific addition:
- `definitions`: a freeform string used to explain the character to an LLM.
- `tags`: a list of short labels used for search, grouping, or filtering.

### 4) `app_specific_settings`: platform UX data
This section isolates presentation details and app-level defaults that should not be treated as canonical across platforms, such as gradients, text colors, or memory mode. Other platforms can safely ignore this section without breaking core behavior.

Current fields:
- `disableAvatarGradient`
- `customGradientEnabled`
- `customGradientColors`
- `customTextColor`
- `customTextSecondary`
- `memoryType`

Platforms may reuse this section or store their own data under `extensions`.

### 5) `meta`: provenance and lifecycle
Metadata is separated from content so consumers can manage data ownership and attribution.

Common uses:
- `createdAt` / `updatedAt` for file versioning
- `source` to track origin (app name, import source)
- `authors` to list creators
- `license` to preserve redistribution terms

### 6) `extensions`: safe vendor extensions
`extensions` is an open object for vendor-specific data. Platforms can namespace their data to avoid collisions:

```json
{
  "extensions": {
    "com.vendor.product": {
      "customField": "value"
    }
  }
}
```

## Examples

Character example: `examples/character.uec`

Persona example: `examples/persona.uec`

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

Validation is structural by default; pass `{ strict: true }` to enforce required fields. The validator treats `app_specific_settings` as an opaque object (only checks it is an object if present). Use `assertUEC` to throw on invalid cards or `isUEC` for boolean checks.

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
use uec::validate_uec;

let card = json!({
  "schema": { "name": "UEC", "version": "1.0" },
  "kind": "persona",
  "payload": { "id": "7b3c1a6f-9c2a-4b0e-8ad3-2e8f4d2c9a61", "title": "Pragmatic Analyst" }
});

let result = validate_uec(&card, true);
assert!(result.ok);
```

Language-specific READMEs live in `js/README.md`, `python/README.md`, and `rust/README.md`.

Package links:
- npm: https://www.npmjs.com/package/unified-entity-card

## File extension recommendation

Use `.uec` to signal a Unified Entity Card while keeping JSON content.

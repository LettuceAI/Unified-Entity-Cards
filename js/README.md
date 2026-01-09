# Unified Entity Card JavaScript Library

Lightweight helpers for creating and validating Unified Entity Cards.

npm: https://www.npmjs.com/package/unified-entity-card

## Usage

```js
import { createCharacterUEC, validateUEC } from "./src/index.js";

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

`app_specific_settings` is treated as an opaque object. Validation focuses on schema, kind, and payload structure.

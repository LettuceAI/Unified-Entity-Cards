# Unified Entity Card JavaScript Library

Lightweight helpers for creating and validating Unified Entity Cards (v1 and v2).

npm: https://www.npmjs.com/package/unified-entity-card

## Usage

### v1 (default)

```js
import { createCharacterUEC, validateUEC } from "unified-entity-card";

const card = createCharacterUEC({
  id: "4c5d8e2a-7a7f-4cda-9f68-6a2b6f4f4f2f",
  name: "Aster Vale",
  description: "A methodical archivist who values evidence over rumor.",
});

const result = validateUEC(card, { strict: true });
if (!result.ok) {
  console.error(result.errors);
}
```

If `systemPrompt` is a template ID, pass `{ systemPromptIsId: true }` to `createCharacterUEC`. It will store the prompt as `_ID:<id>`.

### v2

```js
import { createCharacterUECv2, validateUEC } from "unified-entity-card";

const card = createCharacterUECv2({
  id: "4c5d8e2a-7a7f-4cda-9f68-6a2b6f4f4f2f",
  name: "Aster Vale",
  description: "A methodical archivist who values evidence over rumor.",
  avatar: {
    type: "remote_url",
    url: "https://cdn.example.com/avatars/aster-vale.png",
    mimeType: "image/png",
  },
  promptTemplateId: "prompt_roleplay_archive_v2",
  fallbackModelId: "6af06367-df57-4dfc-a174-9a34f39082f6",
  characterBook: {
    name: "Archive Canon",
    entries: [
      {
        keys: ["claim", "evidence"],
        content: "No claim is accepted without two independent sources.",
        enabled: true,
      },
    ],
  },
});

const result = validateUEC(card, { strict: true });
```

v2 changes from v1:
- `avatar` and `chatBackground` accept a string (legacy) or an asset locator object (`inline_base64`, `remote_url`, `asset_ref`)
- `scene` is a single object (replaces `scenes` array); uses `selectedVariant` (`0` for base content or a variant ID string) instead of `selectedVariantId`; `defaultSceneId` is removed
- `rules` is removed — strict mode flags it as invalid if present
- New fields: `fallbackModelId`, `promptTemplateId`, `nickname`, `creator`, `creatorNotes`, `creatorNotesMultilingual`, `source` (string[]), `characterBook`
- `voiceConfig` only requires `source`; `providerId`/`voiceId` are optional. New optional fields: `userVoiceId`, `modelId`, `voiceName`
- `meta` adds `originalCreatedAt`, `originalUpdatedAt`, `originalSource` (required in strict mode)
- `systemPromptIsId` is ignored — use `promptTemplateId` directly instead

### Converting v1 to v2

```js
import { createCharacterUEC, convertUECv1toV2 } from "unified-entity-card";

const v1 = createCharacterUEC(
  { id: "char-1", name: "Aster Vale", systemPrompt: "my-template" },
  { systemPromptIsId: true },
);

const v2 = convertUECv1toV2(v1);
// v2.schema.version === "2.0"
// v2.payload.promptTemplateId === "my-template"
// v2.payload.rules === undefined
// v2.payload.scene is a single scene object (picked from v1 scenes array)
// v2.payload.scene.selectedVariant === 0 (base content, converted from null)
// v2.meta.originalCreatedAt populated from v1 meta
```

`convertUECv1toV2` bumps the schema version, strips `rules`, picks the default scene from the v1 `scenes` array into a single `scene` object, converts `selectedVariantId` to `selectedVariant` (null/undefined → `0`, string → string), removes `defaultSceneId`, converts `_ID:` system prompts to `promptTemplateId`, and populates `original*` meta fields from existing meta without overwriting values already present.

## Validation

`validateUEC` auto-detects the version from `schema.version` and dispatches to the appropriate validator. Pass `{ strict: true }` for stricter checks.

`app_specific_settings` is treated as an opaque `Record<string, unknown>`. Validation only checks it is an object.

## API

| Export | Description |
|---|---|
| `SCHEMA_NAME` | `"UEC"` |
| `SCHEMA_VERSION` | `"1.0"` |
| `SCHEMA_VERSION_V2` | `"2.0"` |
| `createUEC(options)` | Low-level card constructor (auto-selects v1/v2 from `schema.version`) |
| `createCharacterUEC(payload, options?)` | Create a v1 character card |
| `createPersonaUEC(payload, options?)` | Create a v1 persona card |
| `createCharacterUECv2(payload, options?)` | Create a v2 character card |
| `createPersonaUECv2(payload, options?)` | Create a v2 persona card |
| `convertUECv1toV2(card)` | Convert a v1 card to v2 |
| `validateUEC(value, options?)` | Validate a card (auto-detects version) |
| `isUEC(value, options?)` | Returns `true` if the value is a valid card |
| `assertUEC(value, options?)` | Throws if the value is not a valid card |

## Tests

```bash
cd js && node --test
```

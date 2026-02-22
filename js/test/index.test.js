import test from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMA_NAME,
  SCHEMA_VERSION,
  SCHEMA_VERSION_V2,
  createCharacterUEC,
  createPersonaUEC,
  createCharacterUECv2,
  createPersonaUECv2,
  convertUECv1toV2,
  validateUEC,
  validateUECStrict,
  validateUECAtVersion,
  assertUEC,
  isUEC,
  isCharacterUEC,
  isPersonaUEC,
  parseUEC,
  stringifyUEC,
  normalizeUEC,
  upgradeUEC,
  downgradeUEC,
  diffUEC,
  mergeUEC,
  extractAssets,
  rewriteAssets,
  lintUEC,
} from "../src/index.js";

// ===========================================================================
// v1 tests (unchanged)
// ===========================================================================

test("validateUEC accepts a minimal character in non-strict mode", () => {
  const card = createCharacterUEC({
    id: "char-1",
    name: "Aster Vale",
  });

  const result = validateUEC(card);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
  assert.equal(isUEC(card), true);
});

test("validateUEC enforces strict requirements for character payload", () => {
  const card = createCharacterUEC({
    id: "char-2",
    name: "Aster Vale",
  });

  const result = validateUEC(card, { strict: true });
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});

test("validateUEC requires app_specific_settings to be an object", () => {
  const card = createPersonaUEC(
    {
      id: "per-1",
      title: "Pragmatic Analyst",
    },
    {
      appSpecificSettings: "not-an-object",
    },
  );

  const result = validateUEC(card);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((err) => err.includes("app_specific_settings")));
});

test("assertUEC throws on invalid cards", () => {
  const card = {
    schema: { name: "UEC", version: "1.0" },
    kind: "persona",
    payload: { id: "per-2" },
  };

  assert.throws(() => assertUEC(card));
});

test("createCharacterUEC prefixes systemPrompt when systemPromptIsId is true", () => {
  const card = createCharacterUEC(
    {
      id: "char-3",
      name: "Aster Vale",
      systemPrompt: "template-1",
    },
    { systemPromptIsId: true },
  );

  assert.equal(card.payload.systemPrompt, "_ID:template-1");
});

test("validateUEC validates scene variants", () => {
  const card = createCharacterUEC({
    id: "char-4",
    name: "Aster Vale",
    scenes: [
      {
        id: "scene-1",
        content: "You step into the Archive of Echoes.",
        variants: [
          {
            id: "variant-1",
            content: "You step into the Archive, where every echo is logged.",
            createdAt: 1715100001,
          },
        ],
      },
    ],
  });

  const result = validateUEC(card);
  assert.equal(result.ok, true);

  const invalid = createCharacterUEC({
    id: "char-5",
    name: "Aster Vale",
    scenes: [
      {
        id: "scene-2",
        content: "You step into the Archive of Echoes.",
        variants: [{ content: "Missing id and createdAt" }],
      },
    ],
  });

  const invalidResult = validateUEC(invalid);
  assert.equal(invalidResult.ok, false);
  assert.ok(invalidResult.errors.some((err) => err.includes("variants[0].id")));
});

// ===========================================================================
// v2 constants
// ===========================================================================

test("v2 constants are exported", () => {
  assert.equal(SCHEMA_NAME, "UEC");
  assert.equal(SCHEMA_VERSION, "1.0");
  assert.equal(SCHEMA_VERSION_V2, "2.0");
});

// ===========================================================================
// v2 creation
// ===========================================================================

test("createCharacterUECv2 creates a v2 envelope", () => {
  const card = createCharacterUECv2({
    id: "char-v2-1",
    name: "Aster Vale",
  });

  assert.equal(card.schema.name, "UEC");
  assert.equal(card.schema.version, "2.0");
  assert.equal(card.kind, "character");
  assert.equal(card.payload.id, "char-v2-1");
  assert.deepEqual(card.app_specific_settings, {});
  assert.deepEqual(card.meta, {});
  assert.deepEqual(card.extensions, {});
});

test("createPersonaUECv2 creates a v2 persona", () => {
  const card = createPersonaUECv2({
    id: "per-v2-1",
    title: "Test Persona",
  });

  assert.equal(card.schema.version, "2.0");
  assert.equal(card.kind, "persona");
  assert.equal(card.payload.title, "Test Persona");
});

test("createCharacterUEC with schema.version 2.0 creates v2", () => {
  const card = createCharacterUEC(
    { id: "char-via-v1", name: "Test" },
    { schema: { version: "2.0" } },
  );

  assert.equal(card.schema.version, "2.0");
});

test("systemPromptIsId is ignored in v2", () => {
  const card = createCharacterUECv2(
    {
      id: "char-v2-2",
      name: "Aster Vale",
      systemPrompt: "template-1",
    },
    { systemPromptIsId: true },
  );

  // Should NOT be prefixed with _ID:
  assert.equal(card.payload.systemPrompt, "template-1");
});

// ===========================================================================
// v2 validation — non-strict minimal
// ===========================================================================

test("validateUEC accepts a minimal v2 character in non-strict mode", () => {
  const card = createCharacterUECv2({
    id: "char-v2-3",
    name: "Aster Vale",
  });

  const result = validateUEC(card);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test("validateUEC accepts a minimal v2 persona in non-strict mode", () => {
  const card = createPersonaUECv2({
    id: "per-v2-2",
    title: "Persona V2",
  });

  const result = validateUEC(card);
  assert.equal(result.ok, true);
});

// ===========================================================================
// v2 asset locators
// ===========================================================================

test("v2 accepts legacy string avatar", () => {
  const card = createCharacterUECv2({
    id: "a1",
    name: "Test",
    avatar: "https://example.com/avatar.png",
  });
  assert.equal(validateUEC(card).ok, true);
});

test("v2 accepts inline_base64 asset locator", () => {
  const card = createCharacterUECv2({
    id: "a2",
    name: "Test",
    avatar: {
      type: "inline_base64",
      data: "data:image/png;base64,abc123",
      mimeType: "image/png",
    },
  });
  assert.equal(validateUEC(card).ok, true);
});

test("v2 accepts remote_url asset locator", () => {
  const card = createCharacterUECv2({
    id: "a3",
    name: "Test",
    avatar: {
      type: "remote_url",
      url: "https://cdn.example.com/avatar.png",
      mimeType: "image/png",
    },
  });
  assert.equal(validateUEC(card).ok, true);
});

test("v2 accepts asset_ref asset locator", () => {
  const card = createCharacterUECv2({
    id: "a4",
    name: "Test",
    chatBackground: {
      type: "asset_ref",
      assetId: "bg-hash-123",
    },
  });
  assert.equal(validateUEC(card).ok, true);
});

test("v2 rejects invalid asset locator type", () => {
  const card = createCharacterUECv2({
    id: "a5",
    name: "Test",
    avatar: 42,
  });
  const result = validateUEC(card);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("payload.avatar")));
});

test("v2 rejects asset locator with missing required sub-field", () => {
  const card = createCharacterUECv2({
    id: "a6",
    name: "Test",
    avatar: { type: "remote_url" },
  });
  const result = validateUEC(card);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("payload.avatar.url")));
});

test("v2 rejects inline_base64 without data", () => {
  const card = createCharacterUECv2({
    id: "a7",
    name: "Test",
    avatar: { type: "inline_base64", mimeType: "image/png" },
  });
  const result = validateUEC(card);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("payload.avatar.data")));
});

test("v2 rejects asset_ref without assetId", () => {
  const card = createCharacterUECv2({
    id: "a8",
    name: "Test",
    avatar: { type: "asset_ref" },
  });
  const result = validateUEC(card);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("payload.avatar.assetId")));
});

// ===========================================================================
// v2 characterBook
// ===========================================================================

test("v2 accepts valid characterBook", () => {
  const card = createCharacterUECv2({
    id: "cb1",
    name: "Test",
    characterBook: {
      name: "Lore",
      description: "Test lore",
      entries: [
        {
          name: "Entry 1",
          keys: ["key1"],
          content: "Some lore content",
          enabled: true,
          insertion_order: 0,
        },
      ],
    },
  });
  assert.equal(validateUEC(card).ok, true);
});

test("v2 rejects characterBook with invalid entries", () => {
  const card = createCharacterUECv2({
    id: "cb2",
    name: "Test",
    characterBook: {
      entries: [{ name: "Bad entry" }],
    },
  });
  const result = validateUEC(card);
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((e) => e.includes("characterBook.entries[0].content")),
  );
});

test("v2 rejects characterBook entries that is not an array", () => {
  const card = createCharacterUECv2({
    id: "cb3",
    name: "Test",
    characterBook: { entries: "not-an-array" },
  });
  const result = validateUEC(card);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("characterBook.entries")));
});

// ===========================================================================
// v2 voiceConfig
// ===========================================================================

test("v2 voiceConfig with source only is valid", () => {
  const card = createCharacterUECv2({
    id: "vc1",
    name: "Test",
    voiceConfig: { source: "provider" },
  });
  assert.equal(validateUEC(card).ok, true);
});

test("v2 voiceConfig full config is valid", () => {
  const card = createCharacterUECv2({
    id: "vc2",
    name: "Test",
    voiceConfig: {
      source: "provider",
      providerId: "openai",
      voiceId: "nova",
      userVoiceId: "user-123",
      modelId: "gpt-4o-mini-tts",
      voiceName: "Nova",
    },
  });
  assert.equal(validateUEC(card).ok, true);
});

test("v2 voiceConfig rejects missing source", () => {
  const card = createCharacterUECv2({
    id: "vc3",
    name: "Test",
    voiceConfig: { providerId: "openai", voiceId: "nova" },
  });
  const result = validateUEC(card);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("voiceConfig.source")));
});

test("v1 voiceConfig still requires providerId and voiceId", () => {
  const card = createCharacterUEC({
    id: "vc-v1",
    name: "Test",
    voiceConfig: { source: "provider" },
  });
  const result = validateUEC(card);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("voiceConfig.providerId")));
  assert.ok(result.errors.some((e) => e.includes("voiceConfig.voiceId")));
});

// ===========================================================================
// v2 strict mode
// ===========================================================================

test("v2 strict mode does NOT require rules", () => {
  const card = createCharacterUECv2({
    id: "s1",
    name: "Test",
    description: "A test character",
    scene: { id: "sc1", content: "Opening scene" },
    createdAt: 1715100000,
    updatedAt: 1715100300,
  });
  card.meta = {
    originalCreatedAt: 1715100000,
    originalUpdatedAt: 1715100300,
  };
  const result = validateUEC(card, { strict: true });
  assert.equal(result.ok, true);
});

test("v2 strict mode warns if rules present", () => {
  const card = createCharacterUECv2({
    id: "s2",
    name: "Test",
    description: "A test character",
    rules: ["Some rule"],
    scene: { id: "sc1", content: "Opening scene" },
    createdAt: 1715100000,
    updatedAt: 1715100300,
  });
  card.meta = {
    originalCreatedAt: 1715100000,
    originalUpdatedAt: 1715100300,
  };
  const result = validateUEC(card, { strict: true });
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(
      (e) =>
        e.includes("payload.rules") && e.includes("not a valid field in v2"),
    ),
  );
});

test("v2 strict mode requires meta.originalCreatedAt and meta.originalUpdatedAt", () => {
  const card = createCharacterUECv2({
    id: "s3",
    name: "Test",
    description: "A test character",
    scene: { id: "sc1", content: "Opening scene" },
    createdAt: 1715100000,
    updatedAt: 1715100300,
  });
  const result = validateUEC(card, { strict: true });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("meta.originalCreatedAt")));
  assert.ok(result.errors.some((e) => e.includes("meta.originalUpdatedAt")));
});

test("v2 strict mode requires meta object when original fields are required", () => {
  const card = createCharacterUECv2({
    id: "s4",
    name: "Test",
    description: "A test character",
    scene: { id: "sc1", content: "Opening scene" },
    createdAt: 1715100000,
    updatedAt: 1715100300,
  });

  const result = validateUEC(card, { strict: true });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("meta.originalCreatedAt")));
  assert.ok(result.errors.some((e) => e.includes("meta.originalUpdatedAt")));
});

// ===========================================================================
// v2 meta validation
// ===========================================================================

test("v2 meta rejects bad types on original* fields", () => {
  const card = createCharacterUECv2(
    { id: "m1", name: "Test" },
    {
      meta: {
        originalCreatedAt: "not-a-number",
        originalUpdatedAt: true,
        originalSource: 42,
      },
    },
  );
  const result = validateUEC(card);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("meta.originalCreatedAt")));
  assert.ok(result.errors.some((e) => e.includes("meta.originalUpdatedAt")));
  assert.ok(result.errors.some((e) => e.includes("meta.originalSource")));
});

// ===========================================================================
// v2 new payload fields
// ===========================================================================

test("v2 validates promptTemplateId, nickname, creator, creatorNotes, source", () => {
  const card = createCharacterUECv2({
    id: "pf1",
    name: "Test",
    promptTemplateId: "tmpl_v2",
    nickname: "Testy",
    creator: "megalith",
    creatorNotes: "A test character for validation",
    source: ["lettuceai"],
  });
  assert.equal(validateUEC(card).ok, true);
});

test("v2 rejects bad types on new payload fields", () => {
  const card = createCharacterUECv2({
    id: "pf2",
    name: "Test",
    promptTemplateId: 42,
    nickname: true,
    creator: [],
    creatorNotes: 0,
    source: "not-an-array",
  });
  const result = validateUEC(card);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("payload.promptTemplateId")));
  assert.ok(result.errors.some((e) => e.includes("payload.nickname")));
  assert.ok(result.errors.some((e) => e.includes("payload.creator")));
  assert.ok(result.errors.some((e) => e.includes("payload.creatorNotes")));
  assert.ok(result.errors.some((e) => e.includes("payload.source")));
});

test("v2 validates fallbackModelId", () => {
  const card = createCharacterUECv2({
    id: "fb1",
    name: "Test",
    fallbackModelId: "model-fallback-123",
  });
  assert.equal(validateUEC(card).ok, true);
});

test("v2 validates creatorNotesMultilingual", () => {
  const card = createCharacterUECv2({
    id: "ml1",
    name: "Test",
    creatorNotesMultilingual: { en: "English notes", ja: "Japanese notes" },
  });
  assert.equal(validateUEC(card).ok, true);
});

test("v2 rejects bad creatorNotesMultilingual", () => {
  const card = createCharacterUECv2({
    id: "ml2",
    name: "Test",
    creatorNotesMultilingual: "not-an-object",
  });
  const result = validateUEC(card);
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((e) => e.includes("payload.creatorNotesMultilingual")),
  );
});

// ===========================================================================
// convertUECv1toV2
// ===========================================================================

test("convertUECv1toV2 bumps version to 2.0", () => {
  const v1 = createCharacterUEC({ id: "cv1", name: "Test" });
  const v2 = convertUECv1toV2(v1);
  assert.equal(v2.schema.version, "2.0");
});

test("convertUECv1toV2 removes rules from payload", () => {
  const v1 = createCharacterUEC({
    id: "cv2",
    name: "Test",
    rules: ["Rule 1", "Rule 2"],
  });
  const v2 = convertUECv1toV2(v1);
  assert.equal(v2.payload.rules, undefined);
});

test("convertUECv1toV2 converts scenes array to single scene", () => {
  const v1 = createCharacterUEC({
    id: "cv-scenes",
    name: "Test",
    scenes: [
      { id: "sc-a", content: "Scene A", direction: "Go" },
      { id: "sc-b", content: "Scene B" },
    ],
    defaultSceneId: "sc-a",
  });
  const v2 = convertUECv1toV2(v1);
  assert.equal(typeof v2.payload.scene, "object");
  assert.equal(Array.isArray(v2.payload.scene), false);
  assert.equal(v2.payload.scene.id, "sc-a");
  assert.equal(v2.payload.scene.content, "Scene A");
  assert.equal(v2.payload.scene.direction, "Go");
  assert.equal(v2.payload.scenes, undefined);
  assert.equal(v2.payload.defaultSceneId, undefined);
});

test("convertUECv1toV2 picks first scene when defaultSceneId not set", () => {
  const v1 = createCharacterUEC({
    id: "cv-scenes-no-default",
    name: "Test",
    scenes: [
      { id: "sc-x", content: "First scene" },
      { id: "sc-y", content: "Second scene" },
    ],
  });
  const v2 = convertUECv1toV2(v1);
  assert.equal(v2.payload.scene.id, "sc-x");
  assert.equal(v2.payload.scene.content, "First scene");
});

test("convertUECv1toV2 removes empty scenes arrays", () => {
  const v1 = createCharacterUEC({
    id: "cv-scenes-empty",
    name: "Test",
    scenes: [],
  });

  const v2 = convertUECv1toV2(v1);
  assert.equal(Object.hasOwn(v2.payload, "scenes"), false);
  assert.equal(v2.payload.scene, undefined);
});

test("convertUECv1toV2 converts selectedVariantId to selectedVariant", () => {
  const v1 = createCharacterUEC({
    id: "cv-sel",
    name: "Test",
    scenes: [
      {
        id: "sc-1",
        content: "Scene",
        selectedVariantId: "var-1",
        variants: [{ id: "var-1", content: "Variant", createdAt: 1000 }],
      },
    ],
  });
  const v2 = convertUECv1toV2(v1);
  assert.equal(v2.payload.scene.selectedVariant, "var-1");
  assert.equal(v2.payload.scene.selectedVariantId, undefined);
});

test("convertUECv1toV2 converts null selectedVariantId to 0", () => {
  const v1 = createCharacterUEC({
    id: "cv-sel-null",
    name: "Test",
    scenes: [{ id: "sc-1", content: "Scene", selectedVariantId: null }],
  });
  const v2 = convertUECv1toV2(v1);
  assert.equal(v2.payload.scene.selectedVariant, 0);
});

test("v2 validates scene as a single object", () => {
  const card = createCharacterUECv2({
    id: "scene-v2",
    name: "Test",
    scene: {
      id: "sc1",
      content: "Opening scene",
      selectedVariant: 0,
    },
  });
  assert.equal(validateUEC(card).ok, true);
});

test("v2 validates scene with selectedVariant as string", () => {
  const card = createCharacterUECv2({
    id: "scene-v2-var",
    name: "Test",
    scene: {
      id: "sc1",
      content: "Opening scene",
      variants: [{ id: "v1", content: "Alt", createdAt: 1000 }],
      selectedVariant: "v1",
    },
  });
  assert.equal(validateUEC(card).ok, true);
});

test("v2 rejects scene with invalid selectedVariant", () => {
  const card = createCharacterUECv2({
    id: "scene-v2-bad",
    name: "Test",
    scene: {
      id: "sc1",
      content: "Opening scene",
      selectedVariant: true,
    },
  });
  const result = validateUEC(card);
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((e) => e.includes("payload.scene.selectedVariant")),
  );
});

test("convertUECv1toV2 converts _ID: systemPrompt to promptTemplateId", () => {
  const v1 = createCharacterUEC(
    { id: "cv3", name: "Test", systemPrompt: "my-template" },
    { systemPromptIsId: true },
  );
  assert.equal(v1.payload.systemPrompt, "_ID:my-template");

  const v2 = convertUECv1toV2(v1);
  assert.equal(v2.payload.promptTemplateId, "my-template");
  assert.equal(v2.payload.systemPrompt, null);
});

test("convertUECv1toV2 does not convert non-_ID systemPrompt", () => {
  const v1 = createCharacterUEC({
    id: "cv3b",
    name: "Test",
    systemPrompt: "You are a helpful assistant.",
  });
  const v2 = convertUECv1toV2(v1);
  assert.equal(v2.payload.systemPrompt, "You are a helpful assistant.");
  assert.equal(v2.payload.promptTemplateId, undefined);
});

test("convertUECv1toV2 populates original* meta from existing meta", () => {
  const v1 = createCharacterUEC(
    { id: "cv4", name: "Test" },
    { meta: { createdAt: 1000, updatedAt: 2000, source: "lettuceai" } },
  );
  const v2 = convertUECv1toV2(v1);
  assert.equal(v2.meta.originalCreatedAt, 1000);
  assert.equal(v2.meta.originalUpdatedAt, 2000);
  assert.equal(v2.meta.originalSource, "lettuceai");
});

test("convertUECv1toV2 does not overwrite existing original* meta", () => {
  const v1 = createCharacterUEC(
    { id: "cv5", name: "Test" },
    {
      meta: {
        createdAt: 1000,
        updatedAt: 2000,
        source: "lettuceai",
        originalCreatedAt: 500,
        originalUpdatedAt: 600,
        originalSource: "external",
      },
    },
  );
  const v2 = convertUECv1toV2(v1);
  assert.equal(v2.meta.originalCreatedAt, 500);
  assert.equal(v2.meta.originalUpdatedAt, 600);
  assert.equal(v2.meta.originalSource, "external");
});

test("convertUECv1toV2 works with persona cards", () => {
  const v1 = createPersonaUEC(
    { id: "pv1", title: "Test Persona" },
    { meta: { createdAt: 1000, updatedAt: 2000 } },
  );
  const v2 = convertUECv1toV2(v1);
  assert.equal(v2.schema.version, "2.0");
  assert.equal(v2.kind, "persona");
  assert.equal(v2.payload.title, "Test Persona");
  assert.equal(v2.meta.originalCreatedAt, 1000);
});

test("convertUECv1toV2 rejects invalid cards", () => {
  const invalid = {
    schema: { name: "UEC", version: "1.0" },
    kind: "character",
    payload: { id: "bad-card" },
  };

  assert.throws(() => convertUECv1toV2(invalid), /card must be a valid v1 UEC/);
});

test("convertUECv1toV2 rejects cards that are already v2", () => {
  const v2Card = createCharacterUECv2({
    id: "already-v2",
    name: "Test",
  });

  assert.throws(() => convertUECv1toV2(v2Card), /schema version "1.0"/);
});

test("converted card validates as v2", () => {
  const v1 = createCharacterUEC({
    id: "cv6",
    name: "Test",
    rules: ["Rule 1"],
    systemPrompt: "my-template",
  });
  // Manually set _ID: prefix
  v1.payload.systemPrompt = "_ID:my-template";

  const v2 = convertUECv1toV2(v1);
  const result = validateUEC(v2);
  assert.equal(result.ok, true);
});

// ===========================================================================
// Cross-version auto-detection
// ===========================================================================

test("v1 and v2 cards both pass their own validation", () => {
  const v1 = createCharacterUEC({
    id: "cross-1",
    name: "Test V1",
  });
  const v2 = createCharacterUECv2({
    id: "cross-2",
    name: "Test V2",
  });

  assert.equal(validateUEC(v1).ok, true);
  assert.equal(validateUEC(v2).ok, true);
  assert.equal(isUEC(v1), true);
  assert.equal(isUEC(v2), true);
});

test("unknown schema version is rejected", () => {
  const card = {
    schema: { name: "UEC", version: "3.0" },
    kind: "character",
    payload: { id: "x", name: "X" },
    app_specific_settings: {},
    meta: {},
    extensions: {},
  };
  const result = validateUEC(card);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("unknown version")));
});

test("unknown schema version does not run v1/v2 payload validators", () => {
  const card = {
    schema: { name: "UEC", version: "3.0" },
    kind: "character",
    payload: { id: "x" },
    app_specific_settings: {},
    meta: {},
    extensions: {},
  };

  const result = validateUEC(card);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("unknown version")));
  assert.equal(
    result.errors.some((e) => e.includes("payload.name")),
    false,
  );
});

// ===========================================================================
// Full large example from CARD_FORMAT_LARGE_EXAMPLES.md
// ===========================================================================

test("full large v2 example validates", () => {
  const largeCard = {
    schema: { name: "UEC", version: "2.0" },
    kind: "character",
    payload: {
      id: "4c5d8e2a-7a7f-4cda-9f68-6a2b6f4f4f2f",
      name: "Aster Vale",
      avatar: {
        type: "remote_url",
        url: "https://cdn.example.com/avatars/aster-vale.png",
        mimeType: "image/png",
      },
      chatBackground: {
        type: "remote_url",
        url: "https://cdn.example.com/backgrounds/aster-lab.jpg",
        mimeType: "image/jpeg",
      },
      description: "A methodical archivist who values evidence over rumor.",
      definitions:
        "Aster Vale is a meticulous archivist who speaks in concise, evidence-based statements. They prioritize primary sources, avoid speculation, and ask one clarifying question when uncertain.",
      tags: [
        "archivist",
        "methodical",
        "evidence-based",
        "slow-burn",
        "lore-heavy",
      ],
      scene: {
        id: "c1f4542d-0b6f-4b4e-bf1a-7a9f35c0b3b9",
        content:
          "You step into the Archive of Echoes. Brass catalog lamps glow in long rows. Dust hangs motionless. Aster closes a ledger and studies you with calm attention.",
        direction: "Introduce archive protocol and ask the user intent.",
        createdAt: 1715100000,
        variants: [
          {
            id: "4be8a3d8-2b2a-4fc8-a1d8-5a44dfc9e57e",
            content:
              "You step into the Archive of Echoes, where every whisper is indexed and every oath is notarized.",
            direction: "Set ceremonial tone.",
            createdAt: 1715100001,
          },
          {
            id: "0c9f0f4b-b2d8-4f9f-bb30-4b8bd8db2baf",
            content:
              "The archive smells of ink and old paper. Aster gestures to a vacant desk and asks what claim you want verified.",
            direction: "Set practical investigative tone.",
            createdAt: 1715100002,
          },
        ],
        selectedVariant: "4be8a3d8-2b2a-4fc8-a1d8-5a44dfc9e57e",
      },
      defaultModelId: "4e7da02f-fb4d-4dc6-9e09-dabde3f8bb6f",
      fallbackModelId: "6af06367-df57-4dfc-a174-9a34f39082f6",
      promptTemplateId: "prompt_roleplay_archive_v2",
      systemPrompt:
        "You are Aster Vale, a methodical archivist who prioritizes primary sources and concise, evidence-based answers.",
      voiceConfig: {
        source: "provider",
        providerId: "openai",
        voiceId: "nova",
        modelId: "gpt-4o-mini-tts",
        voiceName: "Nova",
      },
      voiceAutoplay: false,
      characterBook: {
        name: "Archive Canon",
        description: "Core facts and institutional rules used in retrieval.",
        entries: [
          {
            name: "Rule of Claims",
            keys: ["claim", "evidence", "proof"],
            secondary_keys: ["rumor", "speculation"],
            content:
              "No claim is accepted without two independent sources or one authenticated primary document.",
            enabled: true,
            insertion_order: 0,
            case_sensitive: false,
            priority: 50,
            constant: true,
          },
          {
            name: "Chain of Custody",
            keys: ["custody", "seal", "tamper"],
            secondary_keys: ["ledger", "archive"],
            content:
              "Any broken seal requires custody reconstruction before interpretation.",
            enabled: true,
            insertion_order: 1,
            case_sensitive: false,
            priority: 40,
            constant: false,
          },
        ],
      },
      createdAt: 1715100000,
      updatedAt: 1715100300,
    },
    app_specific_settings: {
      disableAvatarGradient: false,
      customGradientEnabled: true,
      customGradientColors: ["#f5c16c", "#5a7ddc"],
      customTextColor: "#1f1a16",
      customTextSecondary: "#6f6258",
      memoryType: "manual",
      backgroundImportPolicy: "preserve_url",
      preserveSourceOnImport: true,
    },
    meta: {
      createdAt: 1715100000,
      updatedAt: 1715100300,
      originalCreatedAt: 1715100000,
      originalUpdatedAt: 1715100300,
      source: "lettuceai",
      originalSource: "lettuceai",
      authors: ["megalith", "team-archive"],
    },
    extensions: {
      "app.lettuceai.character": {
        uiPreset: "archivist-gold",
        experimentalFlags: ["strict-evidence-mode"],
      },
    },
  };

  const result = validateUEC(largeCard);
  assert.equal(result.ok, true, `Errors: ${result.errors.join("; ")}`);

  // Also passes strict mode
  const strictResult = validateUEC(largeCard, { strict: true });
  assert.equal(
    strictResult.ok,
    true,
    `Strict errors: ${strictResult.errors.join("; ")}`,
  );
});

// ===========================================================================
// Utility helpers
// ===========================================================================

test("parseUEC parses and validates valid JSON", () => {
  const json = JSON.stringify(createCharacterUEC({ id: "p1", name: "Parse" }));
  const result = parseUEC(json);
  assert.equal(result.ok, true);
  assert.equal(result.value.kind, "character");
});

test("parseUEC returns parse errors for invalid JSON", () => {
  const result = parseUEC("{ bad json");
  assert.equal(result.ok, false);
  assert.ok(result.errors[0].includes("invalid JSON"));
});

test("stringifyUEC returns canonical deterministic output", () => {
  const text = stringifyUEC({
    kind: "character",
    schema: { version: "1.0", name: "UEC" },
    payload: { name: "X", id: "id-1" },
  });

  assert.equal(text.includes('"schema"'), true);
  assert.equal(text.indexOf('"kind"') < text.indexOf('"payload"'), true);
  assert.equal(text.indexOf('"payload"') < text.indexOf('"schema"'), true);
});

test("normalizeUEC strips undefined fields and fills top-level objects", () => {
  const normalized = normalizeUEC({
    schema: { name: "UEC", version: "1.0", compat: undefined },
    kind: "persona",
    payload: { id: "n1", title: "N", avatar: undefined },
  });

  assert.equal(normalized.schema.compat, undefined);
  assert.deepEqual(normalized.app_specific_settings, {});
  assert.deepEqual(normalized.meta, {});
  assert.deepEqual(normalized.extensions, {});
  assert.equal(Object.hasOwn(normalized.payload, "avatar"), false);
});

test("upgradeUEC upgrades v1 cards to v2", () => {
  const v1 = createCharacterUEC({ id: "u1", name: "Upgrade" });
  const upgraded = upgradeUEC(v1);
  assert.equal(upgraded.schema.version, "2.0");
});

test("downgradeUEC downgrades v2 and reports warnings for dropped fields", () => {
  const v2 = createCharacterUECv2({
    id: "d1",
    name: "Down",
    promptTemplateId: "tmpl-1",
    fallbackModelId: "fb",
  });
  const result = downgradeUEC(v2);
  assert.equal(result.card.schema.version, "1.0");
  assert.equal(Array.isArray(result.warnings), true);
  assert.ok(result.warnings.some((w) => w.includes("promptTemplateId")));
});

test("validateUECStrict applies strict validation", () => {
  const card = createCharacterUECv2({ id: "vs1", name: "Strict" });
  const result = validateUECStrict(card);
  assert.equal(result.ok, false);
});

test("validateUECAtVersion enforces explicit version", () => {
  const card = createCharacterUECv2({ id: "vv1", name: "Versioned" });
  const result = validateUECAtVersion(card, "1.0");
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('expected "1.0"')));
});

test("isCharacterUEC and isPersonaUEC narrow by kind", () => {
  const character = createCharacterUEC({ id: "k1", name: "Kind" });
  const persona = createPersonaUEC({ id: "k2", title: "Kind Persona" });
  assert.equal(isCharacterUEC(character), true);
  assert.equal(isPersonaUEC(character), false);
  assert.equal(isCharacterUEC(persona), false);
  assert.equal(isPersonaUEC(persona), true);
});

test("diffUEC returns semantic changes", () => {
  const left = createPersonaUEC({ id: "df1", title: "A" });
  const right = createPersonaUEC({ id: "df1", title: "B" });
  const diff = diffUEC(left, right);
  assert.ok(diff.some((entry) => entry.path.endsWith("payload.title")));
});

test("mergeUEC merges and reports conflicts", () => {
  const base = { a: 1, nested: { value: "x" } };
  const incoming = { a: 2, nested: { value: "y" } };
  const merged = mergeUEC(base, incoming);
  assert.equal(merged.value.a, 2);
  assert.ok(merged.conflicts.includes("a"));
});

test("extractAssets and rewriteAssets operate on asset fields", () => {
  const card = createCharacterUECv2({
    id: "asset-1",
    name: "Asset",
    avatar: "https://example.com/avatar.png",
    chatBackground: {
      type: "remote_url",
      url: "https://example.com/bg.png",
      mimeType: "image/png",
    },
  });

  const assets = extractAssets(card);
  assert.ok(assets.some((asset) => asset.path.endsWith("payload.avatar")));
  assert.ok(
    assets.some(
      (asset) =>
        asset.path.endsWith("payload.chatBackground") &&
        asset.kind === "locator",
    ),
  );

  const rewritten = rewriteAssets(card, (asset) => {
    if (asset.kind === "string") {
      return String(asset.value).replace("example.com", "cdn.example.com");
    }
    if (asset.kind === "locator" && asset.value.type === "remote_url") {
      return { ...asset.value, url: "https://cdn.example.com/bg.png" };
    }
    return asset.value;
  });

  assert.equal(rewritten.payload.avatar.includes("cdn.example.com"), true);
  assert.equal(
    rewritten.payload.chatBackground.url,
    "https://cdn.example.com/bg.png",
  );
});

test("lintUEC returns warnings for quality issues", () => {
  const card = createCharacterUECv2({
    id: "lint-1",
    name: "Lint",
    description: " ",
    createdAt: 20,
    updatedAt: 10,
    scene: {
      id: "scene-1",
      content: "Scene",
      selectedVariant: "missing",
      variants: [{ id: "v1", content: "Variant", createdAt: 1 }],
    },
  });

  const lint = lintUEC(card);
  assert.equal(lint.ok, false);
  assert.ok(lint.warnings.some((w) => w.includes("empty string")));
  assert.ok(lint.warnings.some((w) => w.includes("selectedVariant")));
});

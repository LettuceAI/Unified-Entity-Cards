import test from "node:test";
import assert from "node:assert/strict";
import {
  createCharacterUEC,
  createPersonaUEC,
  validateUEC,
  assertUEC,
  isUEC,
} from "../src/index.js";

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
  const card = createPersonaUEC({
    id: "per-1",
    title: "Pragmatic Analyst",
  }, {
    appSpecificSettings: "not-an-object",
  });

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

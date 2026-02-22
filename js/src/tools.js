import { SCHEMA_VERSION, SCHEMA_VERSION_V2 } from "./constants.js";
import { convertUECv1toV2 } from "./convert.js";
import { validateUEC, isUEC } from "./validate.js";
import { isPlainObject } from "./utils.js";

const isAssetLocatorObject = (value) =>
  isPlainObject(value) &&
  (value.type === "inline_base64" ||
    value.type === "remote_url" ||
    value.type === "asset_ref");

const isLikelyAssetString = (value) =>
  typeof value === "string" &&
  (value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:"));

const normalizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const out = {};
  Object.keys(value)
    .sort()
    .forEach((key) => {
      if (value[key] === undefined) {
        return;
      }
      out[key] = normalizeValue(value[key]);
    });

  return out;
};

const deepEqual = (a, b) => {
  if (a === b) {
    return true;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) {
      return false;
    }
    for (const key of keysA) {
      if (!Object.hasOwn(b, key) || !deepEqual(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }

  return false;
};

const walkDiff = (a, b, path, out) => {
  if (deepEqual(a, b)) {
    return;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i += 1) {
      walkDiff(a[i], b[i], `${path}[${i}]`, out);
    }
    return;
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    Array.from(keys)
      .sort()
      .forEach((key) => {
        const nextPath = path ? `${path}.${key}` : key;
        if (!Object.hasOwn(a, key)) {
          out.push({ path: nextPath, type: "added", after: b[key] });
          return;
        }
        if (!Object.hasOwn(b, key)) {
          out.push({ path: nextPath, type: "removed", before: a[key] });
          return;
        }
        walkDiff(a[key], b[key], nextPath, out);
      });
    return;
  }

  out.push({ path: path || "root", type: "changed", before: a, after: b });
};

const deepClone = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const out = {};
  for (const key of Object.keys(value)) {
    out[key] = deepClone(value[key]);
  }
  return out;
};

const mergeValues = (base, incoming, path, strategy, conflicts) => {
  if (incoming === undefined) {
    return deepClone(base);
  }

  if (base === undefined) {
    return deepClone(incoming);
  }

  if (Array.isArray(base) && Array.isArray(incoming)) {
    if (strategy.array === "concat") {
      return [...deepClone(base), ...deepClone(incoming)];
    }
    if (!deepEqual(base, incoming)) {
      conflicts.push(path || "root");
    }
    return deepClone(incoming);
  }

  if (isPlainObject(base) && isPlainObject(incoming)) {
    const out = {};
    const keys = new Set([...Object.keys(base), ...Object.keys(incoming)]);
    for (const key of keys) {
      const nextPath = path ? `${path}.${key}` : key;
      out[key] = mergeValues(base[key], incoming[key], nextPath, strategy, conflicts);
    }
    return out;
  }

  if (!deepEqual(base, incoming)) {
    conflicts.push(path || "root");
  }

  return strategy.conflict === "base" ? deepClone(base) : deepClone(incoming);
};

const toV1FromV2 = (card, options = {}) => {
  const warnings = [];
  const next = deepClone(card);

  next.schema = { ...next.schema, version: SCHEMA_VERSION };

  if (isPlainObject(next.payload)) {
    const payload = { ...next.payload };

    if (isPlainObject(payload.scene)) {
      const scene = { ...payload.scene };
      if (Object.hasOwn(scene, "selectedVariant")) {
        if (scene.selectedVariant === 0) {
          scene.selectedVariantId = null;
        } else if (typeof scene.selectedVariant === "string") {
          scene.selectedVariantId = scene.selectedVariant;
        }
        delete scene.selectedVariant;
      }
      payload.scenes = [scene];
      payload.defaultSceneId = scene.id;
      delete payload.scene;
    }

    if (payload.promptTemplateId !== undefined) {
      if (!payload.systemPrompt || payload.systemPrompt === null) {
        payload.systemPrompt = `_ID:${payload.promptTemplateId}`;
      }
      warnings.push("payload.promptTemplateId was mapped to v1 systemPrompt and then removed");
      delete payload.promptTemplateId;
    }

    const droppedV2Fields = [
      "fallbackModelId",
      "nickname",
      "creator",
      "creatorNotes",
      "creatorNotesMultilingual",
      "source",
      "characterBook",
    ];

    for (const field of droppedV2Fields) {
      if (payload[field] !== undefined) {
        warnings.push(`payload.${field} is not supported in v1 and was removed`);
        delete payload[field];
      }
    }

    if (!options.keepRules && payload.rules === undefined) {
      payload.rules = [];
    }

    next.payload = payload;
  }

  if (isPlainObject(next.meta)) {
    const meta = { ...next.meta };
    if (meta.originalCreatedAt !== undefined) {
      delete meta.originalCreatedAt;
      warnings.push("meta.originalCreatedAt was removed for v1 compatibility");
    }
    if (meta.originalUpdatedAt !== undefined) {
      delete meta.originalUpdatedAt;
      warnings.push("meta.originalUpdatedAt was removed for v1 compatibility");
    }
    if (meta.originalSource !== undefined) {
      delete meta.originalSource;
      warnings.push("meta.originalSource was removed for v1 compatibility");
    }
    next.meta = meta;
  }

  return { card: next, warnings };
};

export const parseUEC = (json, options) => {
  if (typeof json !== "string") {
    return { ok: false, errors: ["root: json input must be a string"] };
  }

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    return { ok: false, errors: [`root: invalid JSON (${error.message})`] };
  }

  const result = validateUEC(parsed, options);
  if (!result.ok) {
    return result;
  }

  return { ok: true, value: parsed, errors: [] };
};

export const stringifyUEC = (card, options = {}) => {
  const { space = 2 } = options;
  const normalized = normalizeUEC(card);
  return JSON.stringify(normalized, null, space);
};

export const normalizeUEC = (card) => {
  const out = normalizeValue(card);

  if (isPlainObject(out) && !isPlainObject(out.app_specific_settings)) {
    out.app_specific_settings = {};
  }
  if (isPlainObject(out) && !isPlainObject(out.meta)) {
    out.meta = {};
  }
  if (isPlainObject(out) && !isPlainObject(out.extensions)) {
    out.extensions = {};
  }

  return out;
};

export const upgradeUEC = (card, targetVersion = SCHEMA_VERSION_V2) => {
  if (!isPlainObject(card) || !isPlainObject(card.schema)) {
    throw new Error("card must be an object with a schema");
  }

  if (targetVersion === SCHEMA_VERSION_V2) {
    if (card.schema.version === SCHEMA_VERSION_V2) {
      return normalizeUEC(card);
    }
    if (card.schema.version === SCHEMA_VERSION) {
      return convertUECv1toV2(card);
    }
    throw new Error(`unsupported source version: ${String(card.schema.version)}`);
  }

  if (targetVersion === SCHEMA_VERSION) {
    return downgradeUEC(card, targetVersion).card;
  }

  throw new Error(`unsupported target version: ${String(targetVersion)}`);
};

export const downgradeUEC = (card, targetVersion = SCHEMA_VERSION, options = {}) => {
  if (!isPlainObject(card) || !isPlainObject(card.schema)) {
    throw new Error("card must be an object with a schema");
  }

  if (targetVersion !== SCHEMA_VERSION) {
    throw new Error(`unsupported target version: ${String(targetVersion)}`);
  }

  if (card.schema.version === SCHEMA_VERSION) {
    return { card: normalizeUEC(card), warnings: [] };
  }

  if (card.schema.version !== SCHEMA_VERSION_V2) {
    throw new Error(`unsupported source version: ${String(card.schema.version)}`);
  }

  return toV1FromV2(card, options);
};

export const diffUEC = (a, b) => {
  const left = normalizeUEC(a);
  const right = normalizeUEC(b);
  const changes = [];
  walkDiff(left, right, "", changes);
  return changes;
};

export const mergeUEC = (base, incoming, strategy = {}) => {
  const settings = {
    array: strategy.array === "concat" ? "concat" : "replace",
    conflict: strategy.conflict === "base" ? "base" : "incoming",
  };

  const conflicts = [];
  const value = mergeValues(base, incoming, "", settings, conflicts);
  return { value, conflicts: Array.from(new Set(conflicts)).sort() };
};

export const validateUECStrict = (value, options = {}) =>
  validateUEC(value, { ...options, strict: true });

export const validateUECAtVersion = (value, version, options = {}) => {
  const result = validateUEC(value, options);

  if (!isPlainObject(value) || !isPlainObject(value.schema)) {
    return result;
  }

  if (value.schema.version !== version) {
    return {
      ok: false,
      errors: [
        ...result.errors,
        `schema.version: expected \"${version}\" but received \"${value.schema.version}\"`,
      ],
    };
  }

  return result;
};

export const isCharacterUEC = (value, options) =>
  isUEC(value, options) && value.kind === "character";

export const isPersonaUEC = (value, options) =>
  isUEC(value, options) && value.kind === "persona";

export const extractAssets = (card) => {
  const assets = [];

  const walk = (value, path) => {
    if (isLikelyAssetString(value)) {
      assets.push({ path, kind: "string", value });
      return;
    }

    if (isAssetLocatorObject(value)) {
      assets.push({ path, kind: "locator", value: deepClone(value) });
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }

    if (!isPlainObject(value)) {
      return;
    }

    Object.keys(value).forEach((key) => {
      const nextPath = path ? `${path}.${key}` : key;
      walk(value[key], nextPath);
    });
  };

  walk(card, "");
  return assets;
};

export const rewriteAssets = (card, mapper) => {
  const rewrite = (value, path) => {
    if (isLikelyAssetString(value)) {
      return mapper({ path, kind: "string", value });
    }

    if (isAssetLocatorObject(value)) {
      return mapper({ path, kind: "locator", value: deepClone(value) });
    }

    if (Array.isArray(value)) {
      return value.map((item, index) => rewrite(item, `${path}[${index}]`));
    }

    if (!isPlainObject(value)) {
      return value;
    }

    const out = {};
    Object.keys(value).forEach((key) => {
      const nextPath = path ? `${path}.${key}` : key;
      out[key] = rewrite(value[key], nextPath);
    });
    return out;
  };

  return rewrite(card, "");
};

export const lintUEC = (card) => {
  const warnings = [];

  if (!isPlainObject(card) || !isPlainObject(card.payload)) {
    return { ok: false, warnings: ["root: not a valid UEC object shape"] };
  }

  if (typeof card.payload.description === "string" && card.payload.description.trim() === "") {
    warnings.push("payload.description is an empty string");
  }

  if (
    typeof card.payload.createdAt === "number" &&
    typeof card.payload.updatedAt === "number" &&
    card.payload.createdAt > card.payload.updatedAt
  ) {
    warnings.push("payload.createdAt is greater than payload.updatedAt");
  }

  if (isPlainObject(card.meta)) {
    if (
      typeof card.meta.createdAt === "number" &&
      typeof card.meta.updatedAt === "number" &&
      card.meta.createdAt > card.meta.updatedAt
    ) {
      warnings.push("meta.createdAt is greater than meta.updatedAt");
    }
  }

  if (
    isPlainObject(card.schema) &&
    card.schema.version === SCHEMA_VERSION_V2 &&
    isPlainObject(card.payload.scene) &&
    typeof card.payload.scene.selectedVariant === "string" &&
    Array.isArray(card.payload.scene.variants)
  ) {
    const ids = new Set(
      card.payload.scene.variants
        .filter((variant) => isPlainObject(variant) && typeof variant.id === "string")
        .map((variant) => variant.id),
    );

    if (!ids.has(card.payload.scene.selectedVariant)) {
      warnings.push("payload.scene.selectedVariant does not match any variant id");
    }
  }

  extractAssets(card).forEach((asset) => {
    if (
      asset.kind === "locator" &&
      asset.value.type === "inline_base64" &&
      typeof asset.value.data === "string" &&
      asset.value.data.length > 200000
    ) {
      warnings.push(`${asset.path}: inline_base64 asset is very large`);
    }
  });

  return { ok: warnings.length === 0, warnings };
};

export const SCHEMA_NAME = "UEC";
export const SCHEMA_VERSION = "1.0";

const DEFAULT_SCHEMA = Object.freeze({
  name: SCHEMA_NAME,
  version: SCHEMA_VERSION,
});

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isString = (value) => typeof value === "string";
const isNumber = (value) => typeof value === "number" && Number.isFinite(value);
const isBoolean = (value) => typeof value === "boolean";

const optionalString = (value) =>
  value === undefined || value === null || isString(value);

const optionalNumber = (value) => value === undefined || isNumber(value);
const optionalBoolean = (value) => value === undefined || isBoolean(value);

const optionalStringArray = (value) =>
  value === undefined ||
  (Array.isArray(value) && value.every((item) => isString(item)));

const optionalUnknownArray = (value) =>
  value === undefined || (Array.isArray(value) && value.length >= 0);

const optionalObject = (value) => value === undefined || isPlainObject(value);

const pushError = (errors, path, message) => {
  errors.push(`${path}: ${message}`);
};

const validateSchema = (schema, errors) => {
  if (!isPlainObject(schema)) {
    pushError(errors, "schema", "must be an object");
    return;
  }

  if (!isString(schema.name)) {
    pushError(errors, "schema.name", "must be a string");
  } else if (schema.name !== SCHEMA_NAME) {
    pushError(errors, "schema.name", `must be \"${SCHEMA_NAME}\"`);
  }

  if (!isString(schema.version)) {
    pushError(errors, "schema.version", "must be a string");
  }

  if (schema.compat !== undefined && !isString(schema.compat)) {
    pushError(errors, "schema.compat", "must be a string if provided");
  }
};

const validateAppSpecificSettings = (settings, errors) => {
  if (settings === undefined) {
    return;
  }

  if (!isPlainObject(settings)) {
    pushError(errors, "app_specific_settings", "must be an object");
  }
};

const validateMeta = (meta, errors) => {
  if (meta === undefined) {
    return;
  }

  if (!isPlainObject(meta)) {
    pushError(errors, "meta", "must be an object");
    return;
  }

  if (!optionalNumber(meta.createdAt)) {
    pushError(errors, "meta.createdAt", "must be a number");
  }

  if (!optionalNumber(meta.updatedAt)) {
    pushError(errors, "meta.updatedAt", "must be a number");
  }

  if (!optionalString(meta.source)) {
    pushError(errors, "meta.source", "must be a string");
  }

  if (
    meta.authors !== undefined &&
    !(
      Array.isArray(meta.authors) &&
      meta.authors.every((item) => isString(item))
    )
  ) {
    pushError(errors, "meta.authors", "must be an array of strings");
  }

  if (!optionalString(meta.license)) {
    pushError(errors, "meta.license", "must be a string");
  }
};

const validateScene = (scene, path, errors, options) => {
  if (!isPlainObject(scene)) {
    pushError(errors, path, "must be an object");
    return;
  }

  if (!isString(scene.id)) {
    pushError(errors, `${path}.id`, "must be a string");
  }

  if (!isString(scene.content)) {
    pushError(errors, `${path}.content`, "must be a string");
  }

  if (!optionalString(scene.direction)) {
    pushError(errors, `${path}.direction`, "must be a string");
  }

  if (!optionalNumber(scene.createdAt)) {
    pushError(errors, `${path}.createdAt`, "must be a number");
  }

  if (!optionalUnknownArray(scene.variants)) {
    pushError(errors, `${path}.variants`, "must be an array");
  }

  if (
    scene.selectedVariantId !== undefined &&
    !optionalString(scene.selectedVariantId)
  ) {
    pushError(errors, `${path}.selectedVariantId`, "must be a string or null");
  }

  if (options.strict) {
    if (!isString(scene.id)) {
      pushError(errors, `${path}.id`, "is required");
    }
    if (!isString(scene.content)) {
      pushError(errors, `${path}.content`, "is required");
    }
  }
};

const validateVoiceConfig = (voiceConfig, errors) => {
  if (voiceConfig === undefined || voiceConfig === null) {
    return;
  }

  if (!isPlainObject(voiceConfig)) {
    pushError(errors, "payload.voiceConfig", "must be an object");
    return;
  }

  if (!isString(voiceConfig.source)) {
    pushError(errors, "payload.voiceConfig.source", "must be a string");
  }

  if (!isString(voiceConfig.providerId)) {
    pushError(errors, "payload.voiceConfig.providerId", "must be a string");
  }

  if (!isString(voiceConfig.voiceId)) {
    pushError(errors, "payload.voiceConfig.voiceId", "must be a string");
  }
};

const validateCharacterPayload = (payload, errors, options) => {
  if (!isPlainObject(payload)) {
    pushError(errors, "payload", "must be an object");
    return;
  }

  if (!isString(payload.id)) {
    pushError(errors, "payload.id", "must be a string");
  }

  if (!isString(payload.name)) {
    pushError(errors, "payload.name", "must be a string");
  }

  if (!optionalString(payload.description)) {
    pushError(errors, "payload.description", "must be a string");
  }

  if (!optionalString(payload.definitions)) {
    pushError(errors, "payload.definitions", "must be a string");
  }

  if (!optionalStringArray(payload.tags)) {
    pushError(errors, "payload.tags", "must be an array of strings");
  }

  if (!optionalString(payload.avatarPath)) {
    pushError(errors, "payload.avatarPath", "must be a string or null");
  }

  if (!optionalString(payload.backgroundImagePath)) {
    pushError(
      errors,
      "payload.backgroundImagePath",
      "must be a string or null",
    );
  }

  if (!optionalStringArray(payload.rules)) {
    pushError(errors, "payload.rules", "must be an array of strings");
  }

  if (payload.scenes !== undefined) {
    if (!Array.isArray(payload.scenes)) {
      pushError(errors, "payload.scenes", "must be an array");
    } else {
      payload.scenes.forEach((scene, index) =>
        validateScene(scene, `payload.scenes[${index}]`, errors, options),
      );
    }
  }

  if (!optionalString(payload.defaultSceneId)) {
    pushError(errors, "payload.defaultSceneId", "must be a string or null");
  }

  if (!optionalString(payload.defaultModelId)) {
    pushError(errors, "payload.defaultModelId", "must be a string or null");
  }

  if (!optionalString(payload.promptTemplateId)) {
    pushError(errors, "payload.promptTemplateId", "must be a string or null");
  }

  validateVoiceConfig(payload.voiceConfig, errors);

  if (!optionalBoolean(payload.voiceAutoplay)) {
    pushError(errors, "payload.voiceAutoplay", "must be a boolean");
  }

  if (!optionalNumber(payload.createdAt)) {
    pushError(errors, "payload.createdAt", "must be a number");
  }

  if (!optionalNumber(payload.updatedAt)) {
    pushError(errors, "payload.updatedAt", "must be a number");
  }

  if (options.strict) {
    if (!isString(payload.description)) {
      pushError(errors, "payload.description", "is required in strict mode");
    }

    if (!Array.isArray(payload.rules)) {
      pushError(errors, "payload.rules", "is required in strict mode");
    }

    if (!Array.isArray(payload.scenes)) {
      pushError(errors, "payload.scenes", "is required in strict mode");
    }

    if (!isNumber(payload.createdAt)) {
      pushError(errors, "payload.createdAt", "is required in strict mode");
    }

    if (!isNumber(payload.updatedAt)) {
      pushError(errors, "payload.updatedAt", "is required in strict mode");
    }
  }
};

const validatePersonaPayload = (payload, errors, options) => {
  if (!isPlainObject(payload)) {
    pushError(errors, "payload", "must be an object");
    return;
  }

  if (!isString(payload.id)) {
    pushError(errors, "payload.id", "must be a string");
  }

  if (!isString(payload.title)) {
    pushError(errors, "payload.title", "must be a string");
  }

  if (!optionalString(payload.description)) {
    pushError(errors, "payload.description", "must be a string");
  }

  if (!optionalString(payload.avatarPath)) {
    pushError(errors, "payload.avatarPath", "must be a string or null");
  }

  if (!optionalBoolean(payload.isDefault)) {
    pushError(errors, "payload.isDefault", "must be a boolean");
  }

  if (!optionalNumber(payload.createdAt)) {
    pushError(errors, "payload.createdAt", "must be a number");
  }

  if (!optionalNumber(payload.updatedAt)) {
    pushError(errors, "payload.updatedAt", "must be a number");
  }

  if (options.strict) {
    if (!isString(payload.description)) {
      pushError(errors, "payload.description", "is required in strict mode");
    }

    if (!isNumber(payload.createdAt)) {
      pushError(errors, "payload.createdAt", "is required in strict mode");
    }

    if (!isNumber(payload.updatedAt)) {
      pushError(errors, "payload.updatedAt", "is required in strict mode");
    }
  }
};

export const createUEC = ({
  kind,
  payload,
  schema,
  appSpecificSettings,
  meta,
  extensions,
} = {}) => {
  if (!kind) {
    throw new Error("kind is required");
  }

  if (!isPlainObject(payload)) {
    throw new Error("payload must be an object");
  }

  return {
    schema: { ...DEFAULT_SCHEMA, ...(schema || {}) },
    kind,
    payload,
    app_specific_settings: appSpecificSettings || {},
    meta: meta || {},
    extensions: extensions || {},
  };
};

export const createCharacterUEC = (payload, options = {}) =>
  createUEC({ kind: "character", payload, ...options });

export const createPersonaUEC = (payload, options = {}) =>
  createUEC({ kind: "persona", payload, ...options });

export const validateUEC = (value, options = {}) => {
  const errors = [];
  const settings = { strict: false, ...options };

  if (!isPlainObject(value)) {
    pushError(errors, "root", "must be an object");
    return { ok: false, errors };
  }

  validateSchema(value.schema, errors);

  if (value.kind !== "character" && value.kind !== "persona") {
    pushError(errors, "kind", 'must be "character" or "persona"');
  }

  if (!isPlainObject(value.payload)) {
    pushError(errors, "payload", "must be an object");
  } else if (value.kind === "character") {
    validateCharacterPayload(value.payload, errors, settings);
  } else if (value.kind === "persona") {
    validatePersonaPayload(value.payload, errors, settings);
  }

  validateAppSpecificSettings(value.app_specific_settings, errors);
  validateMeta(value.meta, errors);

  if (value.extensions !== undefined && !isPlainObject(value.extensions)) {
    pushError(errors, "extensions", "must be an object");
  }

  return { ok: errors.length === 0, errors };
};

export const isUEC = (value, options) => validateUEC(value, options).ok;

export const assertUEC = (value, options) => {
  const result = validateUEC(value, options);
  if (!result.ok) {
    const error = new Error(`Invalid UEC: ${result.errors.join("; ")}`);
    error.errors = result.errors;
    throw error;
  }
  return value;
};

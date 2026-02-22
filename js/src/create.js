import {
  DEFAULT_SCHEMA,
  DEFAULT_SCHEMA_V2,
  SCHEMA_VERSION_V2,
} from "./constants.js";
import { isPlainObject, isString } from "./utils.js";

const normalizeSystemPrompt = (payload, systemPromptIsId) => {
  if (!systemPromptIsId) {
    return payload;
  }

  if (!isPlainObject(payload)) {
    return payload;
  }

  const systemPrompt = payload.systemPrompt;
  if (!isString(systemPrompt)) {
    return payload;
  }

  if (systemPrompt.startsWith("_ID:")) {
    return payload;
  }

  return { ...payload, systemPrompt: `_ID:${systemPrompt}` };
};

export const createUEC = ({
  kind,
  payload,
  schema,
  appSpecificSettings,
  meta,
  extensions,
  systemPromptIsId,
} = {}) => {
  if (!kind) {
    throw new Error("kind is required");
  }

  if (!isPlainObject(payload)) {
    throw new Error("payload must be an object");
  }

  const isV2 = isPlainObject(schema) && schema.version === SCHEMA_VERSION_V2;
  const defaultSchema = isV2 ? DEFAULT_SCHEMA_V2 : DEFAULT_SCHEMA;

  // v2 ignores systemPromptIsId; callers use promptTemplateId directly
  const normalizedPayload =
    kind === "character" && !isV2
      ? normalizeSystemPrompt(payload, systemPromptIsId)
      : payload;

  return {
    schema: { ...defaultSchema, ...(schema || {}) },
    kind,
    payload: normalizedPayload,
    app_specific_settings: appSpecificSettings || {},
    meta: meta || {},
    extensions: extensions || {},
  };
};

export const createCharacterUEC = (payload, options = {}) =>
  createUEC({ kind: "character", payload, ...options });

export const createPersonaUEC = (payload, options = {}) =>
  createUEC({ kind: "persona", payload, ...options });

export const createCharacterUECv2 = (payload, options = {}) =>
  createUEC({
    kind: "character",
    payload,
    ...options,
    schema: { ...options.schema, version: SCHEMA_VERSION_V2 },
  });

export const createPersonaUECv2 = (payload, options = {}) =>
  createUEC({
    kind: "persona",
    payload,
    ...options,
    schema: { ...options.schema, version: SCHEMA_VERSION_V2 },
  });

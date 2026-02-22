import { SCHEMA_VERSION_V2 } from "./constants.js";
import { isKnownVersion, isPlainObject, pushError } from "./utils.js";
import {
  validateAppSpecificSettings,
  validateSchema,
} from "./validators/schema.js";
import { validateMeta, validateMetaV2 } from "./validators/meta.js";
import {
  validateCharacterPayloadV1,
  validatePersonaPayloadV1,
} from "./validators/payloadV1.js";
import {
  validateCharacterPayloadV2,
  validatePersonaPayloadV2,
} from "./validators/payloadV2.js";

export const validateUEC = (value, options = {}) => {
  const errors = [];
  const settings = { strict: false, ...options };

  if (!isPlainObject(value)) {
    pushError(errors, "root", "must be an object");
    return { ok: false, errors };
  }

  const version = validateSchema(value.schema, errors);

  if (value.kind !== "character" && value.kind !== "persona") {
    pushError(errors, "kind", 'must be "character" or "persona"');
  }

  const isV2 = version === SCHEMA_VERSION_V2;
  const hasKnownVersion = isKnownVersion(version);

  if (!isPlainObject(value.payload)) {
    pushError(errors, "payload", "must be an object");
  } else if (hasKnownVersion) {
    if (value.kind === "character") {
      if (isV2) {
        validateCharacterPayloadV2(value.payload, errors, settings);
      } else {
        validateCharacterPayloadV1(value.payload, errors, settings);
      }
    } else if (value.kind === "persona") {
      if (isV2) {
        validatePersonaPayloadV2(value.payload, errors, settings);
      } else {
        validatePersonaPayloadV1(value.payload, errors, settings);
      }
    }
  }

  validateAppSpecificSettings(value.app_specific_settings, errors);

  if (isV2 && hasKnownVersion) {
    validateMetaV2(value.meta, errors, settings);
  } else {
    validateMeta(value.meta, errors);
  }

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

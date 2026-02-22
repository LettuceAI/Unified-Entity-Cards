import { SCHEMA_NAME } from "../constants.js";
import { isKnownVersion, isPlainObject, isString, pushError } from "../utils.js";

export const validateSchema = (schema, errors) => {
  if (!isPlainObject(schema)) {
    pushError(errors, "schema", "must be an object");
    return undefined;
  }

  if (!isString(schema.name)) {
    pushError(errors, "schema.name", "must be a string");
  } else if (schema.name !== SCHEMA_NAME) {
    pushError(errors, "schema.name", `must be \"${SCHEMA_NAME}\"`);
  }

  if (!isString(schema.version)) {
    pushError(errors, "schema.version", "must be a string");
  } else if (!isKnownVersion(schema.version)) {
    pushError(errors, "schema.version", `unknown version \"${schema.version}\"`);
  }

  if (schema.compat !== undefined && !isString(schema.compat)) {
    pushError(errors, "schema.compat", "must be a string if provided");
  }

  return schema.version;
};

export const validateAppSpecificSettings = (settings, errors) => {
  if (settings === undefined) {
    return;
  }

  if (!isPlainObject(settings)) {
    pushError(errors, "app_specific_settings", "must be an object");
  }
};

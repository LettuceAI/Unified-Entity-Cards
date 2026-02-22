import { KNOWN_VERSIONS } from "./constants.js";

export const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const isString = (value) => typeof value === "string";
export const isNumber = (value) => typeof value === "number" && Number.isFinite(value);
export const isBoolean = (value) => typeof value === "boolean";

export const optionalString = (value) =>
  value === undefined || value === null || isString(value);

export const optionalNumber = (value) => value === undefined || isNumber(value);
export const optionalBoolean = (value) => value === undefined || isBoolean(value);

export const optionalStringArray = (value) =>
  value === undefined ||
  (Array.isArray(value) && value.every((item) => isString(item)));

export const optionalObject = (value) => value === undefined || isPlainObject(value);

export const pushError = (errors, path, message) => {
  errors.push(`${path}: ${message}`);
};

export const isKnownVersion = (version) =>
  isString(version) && KNOWN_VERSIONS.has(version);

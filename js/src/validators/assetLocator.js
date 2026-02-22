import {
  isPlainObject,
  isString,
  optionalString,
  pushError,
} from "../utils.js";

export const validateAssetLocator = (value, path, errors) => {
  if (value === undefined || value === null) {
    return;
  }

  // Legacy string format accepted for backward compat
  if (isString(value)) {
    return;
  }

  if (!isPlainObject(value)) {
    pushError(errors, path, "must be a string, object, or null");
    return;
  }

  const validTypes = ["inline_base64", "remote_url", "asset_ref"];
  if (!isString(value.type) || !validTypes.includes(value.type)) {
    pushError(
      errors,
      `${path}.type`,
      `must be one of: ${validTypes.join(", ")}`,
    );
    return;
  }

  if (!optionalString(value.mimeType)) {
    pushError(errors, `${path}.mimeType`, "must be a string if provided");
  }

  if (value.type === "inline_base64") {
    if (!isString(value.data)) {
      pushError(errors, `${path}.data`, "is required for inline_base64");
    }
  } else if (value.type === "remote_url") {
    if (!isString(value.url)) {
      pushError(errors, `${path}.url`, "is required for remote_url");
    }
  } else if (value.type === "asset_ref") {
    if (!isString(value.assetId)) {
      pushError(errors, `${path}.assetId`, "is required for asset_ref");
    }
  }
};

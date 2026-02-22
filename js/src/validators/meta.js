import {
  isNumber,
  isPlainObject,
  isString,
  optionalNumber,
  optionalString,
  pushError,
} from "../utils.js";

export const validateMeta = (meta, errors) => {
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

export const validateMetaV2 = (meta, errors, options) => {
  // Run base meta validation first
  validateMeta(meta, errors);

  if (options.strict && !isPlainObject(meta)) {
    pushError(errors, "meta.originalCreatedAt", "is required in strict mode");
    pushError(errors, "meta.originalUpdatedAt", "is required in strict mode");
    return;
  }

  if (!isPlainObject(meta)) {
    return;
  }

  if (!optionalNumber(meta.originalCreatedAt)) {
    pushError(errors, "meta.originalCreatedAt", "must be a number");
  }

  if (!optionalNumber(meta.originalUpdatedAt)) {
    pushError(errors, "meta.originalUpdatedAt", "must be a number");
  }

  if (!optionalString(meta.originalSource)) {
    pushError(errors, "meta.originalSource", "must be a string");
  }

  if (options.strict) {
    if (!isNumber(meta.originalCreatedAt)) {
      pushError(errors, "meta.originalCreatedAt", "is required in strict mode");
    }

    if (!isNumber(meta.originalUpdatedAt)) {
      pushError(errors, "meta.originalUpdatedAt", "is required in strict mode");
    }
  }
};

import {
  isNumber,
  isPlainObject,
  isString,
  optionalNumber,
  optionalString,
  pushError,
} from "../utils.js";

const validateVariant = (variant, path, errors) => {
  if (!isPlainObject(variant)) {
    pushError(errors, path, "must be an object");
    return;
  }

  if (!isString(variant.id)) {
    pushError(errors, `${path}.id`, "must be a string");
  }

  if (!isString(variant.content)) {
    pushError(errors, `${path}.content`, "must be a string");
  }

  if (!isNumber(variant.createdAt)) {
    pushError(errors, `${path}.createdAt`, "must be a number");
  }
};

const validateSceneBase = (scene, path, errors, options) => {
  if (!isPlainObject(scene)) {
    pushError(errors, path, "must be an object");
    return false;
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

  if (scene.variants !== undefined) {
    if (!Array.isArray(scene.variants)) {
      pushError(errors, `${path}.variants`, "must be an array");
    } else {
      scene.variants.forEach((variant, index) =>
        validateVariant(variant, `${path}.variants[${index}]`, errors),
      );
    }
  }

  if (options.strict) {
    if (!isString(scene.id)) {
      pushError(errors, `${path}.id`, "is required");
    }
    if (!isString(scene.content)) {
      pushError(errors, `${path}.content`, "is required");
    }
  }

  return true;
};

// v1: scenes are an array, each scene has its own `id`
export const validateScene = (scene, path, errors, options) => {
  if (!validateSceneBase(scene, path, errors, options)) {
    return;
  }

  if (
    scene.selectedVariantId !== undefined &&
    !optionalString(scene.selectedVariantId)
  ) {
    pushError(errors, `${path}.selectedVariantId`, "must be a string or null");
  }
};

// v2: scene is a single object with id, content, variants, and selectedVariant
export const validateSceneV2 = (scene, path, errors, options) => {
  if (!validateSceneBase(scene, path, errors, options)) {
    return;
  }

  // selectedVariant: 0 (base content) or variant ID string
  if (
    scene.selectedVariant !== undefined &&
    scene.selectedVariant !== 0 &&
    !isString(scene.selectedVariant)
  ) {
    pushError(
      errors,
      `${path}.selectedVariant`,
      "must be 0 or a variant ID string",
    );
  }
};

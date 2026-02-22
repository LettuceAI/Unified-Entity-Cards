import {
  isNumber,
  isPlainObject,
  isString,
  optionalBoolean,
  optionalNumber,
  optionalObject,
  optionalString,
  optionalStringArray,
  pushError,
} from "../utils.js";
import { validateAssetLocator } from "./assetLocator.js";
import { validateCharacterBook } from "./characterBook.js";
import { validateSceneV2 } from "./scene.js";
import { validateVoiceConfigV2 } from "./voiceConfig.js";

export const validateCharacterPayloadV2 = (payload, errors, options) => {
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

  // v2: avatar and chatBackground accept asset locator or string
  validateAssetLocator(payload.avatar, "payload.avatar", errors);
  validateAssetLocator(payload.chatBackground, "payload.chatBackground", errors);

  // v2: rules removed; strict mode flags if present
  if (options.strict && payload.rules !== undefined) {
    pushError(
      errors,
      "payload.rules",
      "is not a valid field in v2; use systemPrompt or characterBook instead",
    );
  }

  // v2: scene is a single scene object
  if (payload.scene !== undefined && payload.scene !== null) {
    validateSceneV2(payload.scene, "payload.scene", errors, options);
  }

  if (!optionalString(payload.defaultModelId)) {
    pushError(errors, "payload.defaultModelId", "must be a string or null");
  }

  if (!optionalString(payload.fallbackModelId)) {
    pushError(errors, "payload.fallbackModelId", "must be a string or null");
  }

  if (!optionalString(payload.systemPrompt)) {
    pushError(errors, "payload.systemPrompt", "must be a string or null");
  }

  if (!optionalString(payload.promptTemplateId)) {
    pushError(errors, "payload.promptTemplateId", "must be a string or null");
  }

  if (!optionalString(payload.nickname)) {
    pushError(errors, "payload.nickname", "must be a string or null");
  }

  if (!optionalString(payload.creator)) {
    pushError(errors, "payload.creator", "must be a string or null");
  }

  if (!optionalString(payload.creatorNotes)) {
    pushError(errors, "payload.creatorNotes", "must be a string or null");
  }

  if (!optionalObject(payload.creatorNotesMultilingual)) {
    pushError(
      errors,
      "payload.creatorNotesMultilingual",
      "must be an object if provided",
    );
  }

  // v2: source is an array of strings (not the same as meta.source)
  if (
    payload.source !== undefined &&
    !(
      Array.isArray(payload.source) &&
      payload.source.every((item) => isString(item))
    )
  ) {
    pushError(errors, "payload.source", "must be an array of strings");
  }

  validateVoiceConfigV2(payload.voiceConfig, errors);

  if (!optionalBoolean(payload.voiceAutoplay)) {
    pushError(errors, "payload.voiceAutoplay", "must be a boolean");
  }

  validateCharacterBook(payload.characterBook, errors);

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

    if (!isPlainObject(payload.scene)) {
      pushError(errors, "payload.scene", "is required in strict mode");
    }

    if (!isNumber(payload.createdAt)) {
      pushError(errors, "payload.createdAt", "is required in strict mode");
    }

    if (!isNumber(payload.updatedAt)) {
      pushError(errors, "payload.updatedAt", "is required in strict mode");
    }
  }
};

export const validatePersonaPayloadV2 = (payload, errors, options) => {
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

  // v2: avatar accepts asset locator or string
  validateAssetLocator(payload.avatar, "payload.avatar", errors);

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

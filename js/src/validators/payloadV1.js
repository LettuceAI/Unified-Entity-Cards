import {
  isNumber,
  isPlainObject,
  isString,
  optionalBoolean,
  optionalNumber,
  optionalString,
  optionalStringArray,
  pushError,
} from "../utils.js";
import { validateScene } from "./scene.js";
import { validateVoiceConfig } from "./voiceConfig.js";

export const validateCharacterPayloadV1 = (payload, errors, options) => {
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

  if (!optionalString(payload.avatar)) {
    pushError(errors, "payload.avatar", "must be a string or null");
  }

  if (!optionalString(payload.chatBackground)) {
    pushError(errors, "payload.chatBackground", "must be a string or null");
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

  if (!optionalString(payload.systemPrompt)) {
    pushError(errors, "payload.systemPrompt", "must be a string or null");
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

export const validatePersonaPayloadV1 = (payload, errors, options) => {
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

  if (!optionalString(payload.avatar)) {
    pushError(errors, "payload.avatar", "must be a string or null");
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

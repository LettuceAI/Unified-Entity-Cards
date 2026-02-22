import { isPlainObject, isString, optionalString, pushError } from "../utils.js";

export const validateVoiceConfig = (voiceConfig, errors) => {
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

export const validateVoiceConfigV2 = (voiceConfig, errors) => {
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

  if (!optionalString(voiceConfig.providerId)) {
    pushError(
      errors,
      "payload.voiceConfig.providerId",
      "must be a string if provided",
    );
  }

  if (!optionalString(voiceConfig.voiceId)) {
    pushError(
      errors,
      "payload.voiceConfig.voiceId",
      "must be a string if provided",
    );
  }

  if (!optionalString(voiceConfig.userVoiceId)) {
    pushError(
      errors,
      "payload.voiceConfig.userVoiceId",
      "must be a string if provided",
    );
  }

  if (!optionalString(voiceConfig.modelId)) {
    pushError(
      errors,
      "payload.voiceConfig.modelId",
      "must be a string if provided",
    );
  }

  if (!optionalString(voiceConfig.voiceName)) {
    pushError(
      errors,
      "payload.voiceConfig.voiceName",
      "must be a string if provided",
    );
  }
};

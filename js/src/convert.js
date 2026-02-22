import { SCHEMA_VERSION, SCHEMA_VERSION_V2 } from "./constants.js";
import { isNumber, isPlainObject, isString } from "./utils.js";
import { validateUEC } from "./validate.js";

export const convertUECv1toV2 = (card) => {
  if (!isPlainObject(card)) {
    throw new Error("card must be an object");
  }

  const validationResult = validateUEC(card);
  if (!validationResult.ok) {
    throw new Error(
      `card must be a valid v1 UEC: ${validationResult.errors.join("; ")}`,
    );
  }

  if (card.schema.version !== SCHEMA_VERSION) {
    throw new Error(`card must be schema version \"${SCHEMA_VERSION}\" to convert`);
  }

  const newSchema = { ...card.schema, version: SCHEMA_VERSION_V2 };

  const oldPayload = card.payload || {};
  const newPayload = { ...oldPayload };

  // Strip rules
  delete newPayload.rules;

  // Convert scenes array -> single scene (pick defaultSceneId or first)
  if ("scenes" in newPayload) {
    if (Array.isArray(newPayload.scenes) && newPayload.scenes.length > 0) {
      const defaultId = newPayload.defaultSceneId;
      let picked =
        isString(defaultId) &&
        newPayload.scenes.find((scene) =>
          isPlainObject(scene) && scene.id === defaultId,
        );
      if (!picked) {
        picked = newPayload.scenes[0];
      }

      if (isPlainObject(picked)) {
        const scene = { ...picked };

        // Convert selectedVariantId -> selectedVariant (null -> 0, string -> string)
        if ("selectedVariantId" in scene) {
          scene.selectedVariant =
            scene.selectedVariantId === null ||
            scene.selectedVariantId === undefined
              ? 0
              : scene.selectedVariantId;
          delete scene.selectedVariantId;
        }

        newPayload.scene = scene;
      }
    }
    delete newPayload.scenes;
  }
  delete newPayload.defaultSceneId;

  // Convert _ID: systemPrompt hack -> promptTemplateId
  if (
    isString(newPayload.systemPrompt) &&
    newPayload.systemPrompt.startsWith("_ID:")
  ) {
    newPayload.promptTemplateId = newPayload.systemPrompt.slice(4);
    newPayload.systemPrompt = null;
  }

  // Populate original* meta from existing meta (don't overwrite if already set)
  const oldMeta = card.meta || {};
  const newMeta = { ...oldMeta };

  if (newMeta.originalCreatedAt === undefined && isNumber(oldMeta.createdAt)) {
    newMeta.originalCreatedAt = oldMeta.createdAt;
  }

  if (newMeta.originalUpdatedAt === undefined && isNumber(oldMeta.updatedAt)) {
    newMeta.originalUpdatedAt = oldMeta.updatedAt;
  }

  if (newMeta.originalSource === undefined && isString(oldMeta.source)) {
    newMeta.originalSource = oldMeta.source;
  }

  return {
    ...card,
    schema: newSchema,
    payload: newPayload,
    meta: newMeta,
  };
};

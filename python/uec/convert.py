from __future__ import annotations

from typing import Any, Dict

from .constants import SCHEMA_VERSION, SCHEMA_VERSION_V2
from .utils import is_number, is_plain_object, is_string
from .validators import validate_uec


def convert_uec_v1_to_v2(card: Dict[str, Any]) -> Dict[str, Any]:
    if not is_plain_object(card):
        raise ValueError("card must be an object")

    validation = validate_uec(card)
    if not validation.ok:
        raise ValueError(f"card must be a valid v1 UEC: {'; '.join(validation.errors)}")

    schema = card.get("schema")
    schema_version = schema.get("version") if isinstance(schema, dict) else None
    if schema_version != SCHEMA_VERSION:
        raise ValueError(f'card must be schema version "{SCHEMA_VERSION}" to convert')

    next_card = dict(card)
    next_schema = dict(schema) if isinstance(schema, dict) else {}
    next_schema["version"] = SCHEMA_VERSION_V2
    next_card["schema"] = next_schema

    payload_obj = card.get("payload")
    old_payload = payload_obj if isinstance(payload_obj, dict) else {}
    new_payload = dict(old_payload)

    new_payload.pop("rules", None)

    if "scenes" in new_payload:
        scenes = new_payload.get("scenes")
        if isinstance(scenes, list) and len(scenes) > 0:
            default_id = new_payload.get("defaultSceneId")
            picked = None
            if is_string(default_id):
                picked = next(
                    (
                        scene
                        for scene in scenes
                        if is_plain_object(scene) and scene.get("id") == default_id
                    ),
                    None,
                )
            if picked is None:
                picked = scenes[0]

            if is_plain_object(picked):
                scene = dict(picked)
                if "selectedVariantId" in scene:
                    selected = scene.pop("selectedVariantId")
                    scene["selectedVariant"] = 0 if selected is None else selected
                new_payload["scene"] = scene

        new_payload.pop("scenes", None)

    new_payload.pop("defaultSceneId", None)

    system_prompt = new_payload.get("systemPrompt")
    if isinstance(system_prompt, str) and system_prompt.startswith("_ID:"):
        new_payload["promptTemplateId"] = system_prompt[4:]
        new_payload["systemPrompt"] = None

    meta_obj = card.get("meta")
    old_meta = meta_obj if isinstance(meta_obj, dict) else {}
    new_meta = dict(old_meta)

    if new_meta.get("originalCreatedAt") is None and is_number(old_meta.get("createdAt")):
        new_meta["originalCreatedAt"] = old_meta["createdAt"]

    if new_meta.get("originalUpdatedAt") is None and is_number(old_meta.get("updatedAt")):
        new_meta["originalUpdatedAt"] = old_meta["updatedAt"]

    if new_meta.get("originalSource") is None and is_string(old_meta.get("source")):
        new_meta["originalSource"] = old_meta["source"]

    next_card["payload"] = new_payload
    next_card["meta"] = new_meta
    return next_card

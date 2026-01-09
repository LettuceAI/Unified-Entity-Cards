from __future__ import annotations

from dataclasses import dataclass
from math import isfinite
from typing import Any, Dict, List, Optional

SCHEMA_NAME = "UEC"
SCHEMA_VERSION = "1.0"


@dataclass
class ValidationResult:
    ok: bool
    errors: List[str]


def _is_plain_object(value: Any) -> bool:
    return isinstance(value, dict)


def _is_string(value: Any) -> bool:
    return isinstance(value, str)


def _is_number(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    if not isinstance(value, (int, float)):
        return False
    return isfinite(value)


def _is_boolean(value: Any) -> bool:
    return isinstance(value, bool)


def _optional_string(value: Any) -> bool:
    return value is None or _is_string(value)


def _optional_number(value: Any) -> bool:
    return value is None or _is_number(value)


def _optional_boolean(value: Any) -> bool:
    return value is None or _is_boolean(value)


def _optional_string_list(value: Any) -> bool:
    if value is None:
        return True
    return isinstance(value, list) and all(_is_string(item) for item in value)


def _optional_object(value: Any) -> bool:
    return value is None or _is_plain_object(value)


def _push_error(errors: List[str], path: str, message: str) -> None:
    errors.append(f"{path}: {message}")


def _validate_schema(schema: Any, errors: List[str]) -> None:
    if not _is_plain_object(schema):
        _push_error(errors, "schema", "must be an object")
        return

    if not _is_string(schema.get("name")):
        _push_error(errors, "schema.name", "must be a string")
    elif schema.get("name") != SCHEMA_NAME:
        _push_error(errors, "schema.name", f'must be "{SCHEMA_NAME}"')

    if not _is_string(schema.get("version")):
        _push_error(errors, "schema.version", "must be a string")

    if schema.get("compat") is not None and not _is_string(schema.get("compat")):
        _push_error(errors, "schema.compat", "must be a string if provided")


def _validate_app_specific_settings(settings: Any, errors: List[str]) -> None:
    if settings is None:
        return

    if not _is_plain_object(settings):
        _push_error(errors, "app_specific_settings", "must be an object")


def _validate_meta(meta: Any, errors: List[str]) -> None:
    if meta is None:
        return

    if not _is_plain_object(meta):
        _push_error(errors, "meta", "must be an object")
        return

    if not _optional_number(meta.get("createdAt")):
        _push_error(errors, "meta.createdAt", "must be a number")

    if not _optional_number(meta.get("updatedAt")):
        _push_error(errors, "meta.updatedAt", "must be a number")

    if not _optional_string(meta.get("source")):
        _push_error(errors, "meta.source", "must be a string")

    if meta.get("authors") is not None:
        authors = meta.get("authors")
        if not (
            isinstance(authors, list) and all(_is_string(item) for item in authors)
        ):
            _push_error(errors, "meta.authors", "must be an array of strings")

    if not _optional_string(meta.get("license")):
        _push_error(errors, "meta.license", "must be a string")


def _validate_scene(scene: Any, path: str, errors: List[str], strict: bool) -> None:
    if not _is_plain_object(scene):
        _push_error(errors, path, "must be an object")
        return

        if not _is_string(scene.get("id")):
            _push_error(errors, f"{path}.id", "must be a string")

        if not _is_string(scene.get("content")):
            _push_error(errors, f"{path}.content", "must be a string")

        if not _optional_string(scene.get("direction")):
            _push_error(errors, f"{path}.direction", "must be a string")

        if not _optional_number(scene.get("createdAt")):
            _push_error(errors, f"{path}.createdAt", "must be a number")

    variants = scene.get("variants")
    if variants is not None:
        if not isinstance(variants, list):
            _push_error(errors, f"{path}.variants", "must be an array")
        else:
            for index, variant in enumerate(variants):
                variant_path = f"{path}.variants[{index}]"
                if not _is_plain_object(variant):
                    _push_error(errors, variant_path, "must be an object")
                    continue

                if not _is_string(variant.get("id")):
                    _push_error(errors, f"{variant_path}.id", "must be a string")

                if not _is_string(variant.get("content")):
                    _push_error(errors, f"{variant_path}.content", "must be a string")

                if not _is_number(variant.get("createdAt")):
                    _push_error(errors, f"{variant_path}.createdAt", "must be a number")

        selected_variant_id = scene.get("selectedVariantId")
        if selected_variant_id is not None and not _optional_string(
            selected_variant_id
        ):
            _push_error(errors, f"{path}.selectedVariantId", "must be a string or null")

        if strict:
            if not _is_string(scene.get("id")):
                _push_error(errors, f"{path}.id", "is required")
            if not _is_string(scene.get("content")):
                _push_error(errors, f"{path}.content", "is required")


def _validate_voice_config(voice_config: Any, errors: List[str]) -> None:
    if voice_config is None:
        return

    if not _is_plain_object(voice_config):
        _push_error(errors, "payload.voiceConfig", "must be an object")
        return

    if not _is_string(voice_config.get("source")):
        _push_error(errors, "payload.voiceConfig.source", "must be a string")

    if not _is_string(voice_config.get("providerId")):
        _push_error(errors, "payload.voiceConfig.providerId", "must be a string")

    if not _is_string(voice_config.get("voiceId")):
        _push_error(errors, "payload.voiceConfig.voiceId", "must be a string")


def _validate_character_payload(payload: Any, errors: List[str], strict: bool) -> None:
    if not _is_plain_object(payload):
        _push_error(errors, "payload", "must be an object")
        return

    if not _is_string(payload.get("id")):
        _push_error(errors, "payload.id", "must be a string")

    if not _is_string(payload.get("name")):
        _push_error(errors, "payload.name", "must be a string")

    if not _optional_string(payload.get("description")):
        _push_error(errors, "payload.description", "must be a string")

    if not _optional_string(payload.get("definitions")):
        _push_error(errors, "payload.definitions", "must be a string")

    if not _optional_string_list(payload.get("tags")):
        _push_error(errors, "payload.tags", "must be an array of strings")

    if not _optional_string(payload.get("avatar")):
        _push_error(errors, "payload.avatar", "must be a string or null")

    if not _optional_string(payload.get("chatBackground")):
        _push_error(errors, "payload.chatBackground", "must be a string or null")

    if not _optional_string_list(payload.get("rules")):
        _push_error(errors, "payload.rules", "must be an array of strings")

    if payload.get("scenes") is not None:
        scenes = payload.get("scenes")
        if not isinstance(scenes, list):
            _push_error(errors, "payload.scenes", "must be an array")
        else:
            for index, scene in enumerate(scenes):
                _validate_scene(scene, f"payload.scenes[{index}]", errors, strict)

    if not _optional_string(payload.get("defaultSceneId")):
        _push_error(errors, "payload.defaultSceneId", "must be a string or null")

    if not _optional_string(payload.get("defaultModelId")):
        _push_error(errors, "payload.defaultModelId", "must be a string or null")

    if not _optional_string(payload.get("systemPrompt")):
        _push_error(errors, "payload.systemPrompt", "must be a string or null")

    _validate_voice_config(payload.get("voiceConfig"), errors)

    if not _optional_boolean(payload.get("voiceAutoplay")):
        _push_error(errors, "payload.voiceAutoplay", "must be a boolean")

    if not _optional_number(payload.get("createdAt")):
        _push_error(errors, "payload.createdAt", "must be a number")

    if not _optional_number(payload.get("updatedAt")):
        _push_error(errors, "payload.updatedAt", "must be a number")

    if strict:
        if not _is_string(payload.get("description")):
            _push_error(errors, "payload.description", "is required in strict mode")

        if not isinstance(payload.get("rules"), list):
            _push_error(errors, "payload.rules", "is required in strict mode")

        if not isinstance(payload.get("scenes"), list):
            _push_error(errors, "payload.scenes", "is required in strict mode")

        if not _is_number(payload.get("createdAt")):
            _push_error(errors, "payload.createdAt", "is required in strict mode")

        if not _is_number(payload.get("updatedAt")):
            _push_error(errors, "payload.updatedAt", "is required in strict mode")


def _validate_persona_payload(payload: Any, errors: List[str], strict: bool) -> None:
    if not _is_plain_object(payload):
        _push_error(errors, "payload", "must be an object")
        return

    if not _is_string(payload.get("id")):
        _push_error(errors, "payload.id", "must be a string")

    if not _is_string(payload.get("title")):
        _push_error(errors, "payload.title", "must be a string")

    if not _optional_string(payload.get("description")):
        _push_error(errors, "payload.description", "must be a string")

    if not _optional_string(payload.get("avatar")):
        _push_error(errors, "payload.avatar", "must be a string or null")

    if not _optional_boolean(payload.get("isDefault")):
        _push_error(errors, "payload.isDefault", "must be a boolean")

    if not _optional_number(payload.get("createdAt")):
        _push_error(errors, "payload.createdAt", "must be a number")

    if not _optional_number(payload.get("updatedAt")):
        _push_error(errors, "payload.updatedAt", "must be a number")

    if strict:
        if not _is_string(payload.get("description")):
            _push_error(errors, "payload.description", "is required in strict mode")

        if not _is_number(payload.get("createdAt")):
            _push_error(errors, "payload.createdAt", "is required in strict mode")

        if not _is_number(payload.get("updatedAt")):
            _push_error(errors, "payload.updatedAt", "is required in strict mode")


def create_uec(
    kind: str,
    payload: Dict[str, Any],
    schema: Optional[Dict[str, Any]] = None,
    app_specific_settings: Optional[Dict[str, Any]] = None,
    meta: Optional[Dict[str, Any]] = None,
    extensions: Optional[Dict[str, Any]] = None,
    system_prompt_is_id: bool = False,
) -> Dict[str, Any]:
    if not kind:
        raise ValueError("kind is required")

    if not _is_plain_object(payload):
        raise ValueError("payload must be an object")

    merged_schema = {"name": SCHEMA_NAME, "version": SCHEMA_VERSION}
    if schema:
        merged_schema.update(schema)

    normalized_payload = payload
    if kind == "character" and system_prompt_is_id:
        system_prompt = payload.get("systemPrompt")
        if isinstance(system_prompt, str) and not system_prompt.startswith("_ID:"):
            normalized_payload = dict(payload)
            normalized_payload["systemPrompt"] = f"_ID:{system_prompt}"

    return {
        "schema": merged_schema,
        "kind": kind,
        "payload": normalized_payload,
        "app_specific_settings": app_specific_settings or {},
        "meta": meta or {},
        "extensions": extensions or {},
    }


def create_character_uec(
    payload: Dict[str, Any],
    schema: Optional[Dict[str, Any]] = None,
    app_specific_settings: Optional[Dict[str, Any]] = None,
    meta: Optional[Dict[str, Any]] = None,
    extensions: Optional[Dict[str, Any]] = None,
    system_prompt_is_id: bool = False,
) -> Dict[str, Any]:
    return create_uec(
        "character",
        payload,
        schema=schema,
        app_specific_settings=app_specific_settings,
        meta=meta,
        extensions=extensions,
        system_prompt_is_id=system_prompt_is_id,
    )


def create_persona_uec(
    payload: Dict[str, Any],
    schema: Optional[Dict[str, Any]] = None,
    app_specific_settings: Optional[Dict[str, Any]] = None,
    meta: Optional[Dict[str, Any]] = None,
    extensions: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    return create_uec(
        "persona",
        payload,
        schema=schema,
        app_specific_settings=app_specific_settings,
        meta=meta,
        extensions=extensions,
    )


def validate_uec(value: Any, strict: bool = False) -> ValidationResult:
    errors: List[str] = []

    if not _is_plain_object(value):
        _push_error(errors, "root", "must be an object")
        return ValidationResult(ok=False, errors=errors)

    _validate_schema(value.get("schema"), errors)

    kind = value.get("kind")
    if kind not in ("character", "persona"):
        _push_error(errors, "kind", 'must be "character" or "persona"')

    payload = value.get("payload")
    if not _is_plain_object(payload):
        _push_error(errors, "payload", "must be an object")
    elif kind == "character":
        _validate_character_payload(payload, errors, strict)
    elif kind == "persona":
        _validate_persona_payload(payload, errors, strict)

    _validate_app_specific_settings(value.get("app_specific_settings"), errors)
    _validate_meta(value.get("meta"), errors)

    if value.get("extensions") is not None and not _is_plain_object(
        value.get("extensions")
    ):
        _push_error(errors, "extensions", "must be an object")

    return ValidationResult(ok=len(errors) == 0, errors=errors)


def is_uec(value: Any, strict: bool = False) -> bool:
    return validate_uec(value, strict=strict).ok


def assert_uec(value: Any, strict: bool = False) -> Dict[str, Any]:
    result = validate_uec(value, strict=strict)
    if not result.ok:
        raise ValueError("Invalid UEC: " + "; ".join(result.errors))
    return value


__all__ = [
    "SCHEMA_NAME",
    "SCHEMA_VERSION",
    "ValidationResult",
    "create_uec",
    "create_character_uec",
    "create_persona_uec",
    "validate_uec",
    "is_uec",
    "assert_uec",
]

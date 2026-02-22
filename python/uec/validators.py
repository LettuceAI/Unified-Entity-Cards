from __future__ import annotations

from typing import Any, Dict, List, Optional

from .constants import SCHEMA_NAME, SCHEMA_VERSION_V2
from .types import ValidationResult
from .utils import (
    is_boolean,
    is_known_version,
    is_number,
    is_plain_object,
    is_string,
    optional_boolean,
    optional_number,
    optional_object,
    optional_string,
    optional_string_list,
    push_error,
)


def _validate_asset_locator(value: Any, path: str, errors: List[str]) -> None:
    if value is None:
        return

    if is_string(value):
        return

    if not is_plain_object(value):
        push_error(errors, path, "must be a string, object, or null")
        return

    valid_types = {"inline_base64", "remote_url", "asset_ref"}
    if not is_string(value.get("type")) or value.get("type") not in valid_types:
        push_error(
            errors,
            f"{path}.type",
            "must be one of: inline_base64, remote_url, asset_ref",
        )
        return

    if not optional_string(value.get("mimeType")):
        push_error(errors, f"{path}.mimeType", "must be a string if provided")

    if value["type"] == "inline_base64" and not is_string(value.get("data")):
        push_error(errors, f"{path}.data", "is required for inline_base64")
    elif value["type"] == "remote_url" and not is_string(value.get("url")):
        push_error(errors, f"{path}.url", "is required for remote_url")
    elif value["type"] == "asset_ref" and not is_string(value.get("assetId")):
        push_error(errors, f"{path}.assetId", "is required for asset_ref")


def _validate_character_book(book: Any, errors: List[str]) -> None:
    if book is None:
        return

    if not is_plain_object(book):
        push_error(errors, "payload.characterBook", "must be an object")
        return

    if not optional_string(book.get("name")):
        push_error(errors, "payload.characterBook.name", "must be a string or null")

    if not optional_string(book.get("description")):
        push_error(
            errors,
            "payload.characterBook.description",
            "must be a string or null",
        )

    entries = book.get("entries")
    if entries is None:
        return

    if not isinstance(entries, list):
        push_error(errors, "payload.characterBook.entries", "must be an array")
        return

    for index, entry in enumerate(entries):
        path = f"payload.characterBook.entries[{index}]"
        if not is_plain_object(entry):
            push_error(errors, path, "must be an object")
            continue

        if not optional_string(entry.get("name")):
            push_error(errors, f"{path}.name", "must be a string or null")

        if entry.get("keys") is not None and not (
            isinstance(entry.get("keys"), list)
            and all(is_string(item) for item in entry.get("keys", []))
        ):
            push_error(errors, f"{path}.keys", "must be an array of strings")

        if entry.get("secondary_keys") is not None and not (
            isinstance(entry.get("secondary_keys"), list)
            and all(is_string(item) for item in entry.get("secondary_keys", []))
        ):
            push_error(errors, f"{path}.secondary_keys", "must be an array of strings")

        if not is_string(entry.get("content")):
            push_error(errors, f"{path}.content", "must be a string")

        if not optional_boolean(entry.get("enabled")):
            push_error(errors, f"{path}.enabled", "must be a boolean")

        if not optional_number(entry.get("insertion_order")):
            push_error(errors, f"{path}.insertion_order", "must be a number")

        if not optional_boolean(entry.get("case_sensitive")):
            push_error(errors, f"{path}.case_sensitive", "must be a boolean")

        if not optional_number(entry.get("priority")):
            push_error(errors, f"{path}.priority", "must be a number")

        if not optional_boolean(entry.get("constant")):
            push_error(errors, f"{path}.constant", "must be a boolean")


def _validate_scene_base(scene: Any, path: str, errors: List[str], strict: bool) -> bool:
    if not is_plain_object(scene):
        push_error(errors, path, "must be an object")
        return False

    if not is_string(scene.get("id")):
        push_error(errors, f"{path}.id", "must be a string")

    if not is_string(scene.get("content")):
        push_error(errors, f"{path}.content", "must be a string")

    if not optional_string(scene.get("direction")):
        push_error(errors, f"{path}.direction", "must be a string")

    if not optional_number(scene.get("createdAt")):
        push_error(errors, f"{path}.createdAt", "must be a number")

    variants = scene.get("variants")
    if variants is not None:
        if not isinstance(variants, list):
            push_error(errors, f"{path}.variants", "must be an array")
        else:
            for index, variant in enumerate(variants):
                variant_path = f"{path}.variants[{index}]"
                if not is_plain_object(variant):
                    push_error(errors, variant_path, "must be an object")
                    continue

                if not is_string(variant.get("id")):
                    push_error(errors, f"{variant_path}.id", "must be a string")

                if not is_string(variant.get("content")):
                    push_error(errors, f"{variant_path}.content", "must be a string")

                if not is_number(variant.get("createdAt")):
                    push_error(errors, f"{variant_path}.createdAt", "must be a number")

    if strict:
        if not is_string(scene.get("id")):
            push_error(errors, f"{path}.id", "is required")
        if not is_string(scene.get("content")):
            push_error(errors, f"{path}.content", "is required")

    return True


def _validate_scene(scene: Any, path: str, errors: List[str], strict: bool) -> None:
    if not _validate_scene_base(scene, path, errors, strict):
        return

    if scene.get("selectedVariantId") is not None and not optional_string(
        scene.get("selectedVariantId")
    ):
        push_error(errors, f"{path}.selectedVariantId", "must be a string or null")


def _validate_scene_v2(scene: Any, path: str, errors: List[str], strict: bool) -> None:
    if not _validate_scene_base(scene, path, errors, strict):
        return

    selected = scene.get("selectedVariant")
    if selected is not None and selected != 0 and not is_string(selected):
        push_error(errors, f"{path}.selectedVariant", "must be 0 or a variant ID string")


def _validate_voice_config_v1(voice_config: Any, errors: List[str]) -> None:
    if voice_config is None:
        return

    if not is_plain_object(voice_config):
        push_error(errors, "payload.voiceConfig", "must be an object")
        return

    if not is_string(voice_config.get("source")):
        push_error(errors, "payload.voiceConfig.source", "must be a string")

    if not is_string(voice_config.get("providerId")):
        push_error(errors, "payload.voiceConfig.providerId", "must be a string")

    if not is_string(voice_config.get("voiceId")):
        push_error(errors, "payload.voiceConfig.voiceId", "must be a string")


def _validate_voice_config_v2(voice_config: Any, errors: List[str]) -> None:
    if voice_config is None:
        return

    if not is_plain_object(voice_config):
        push_error(errors, "payload.voiceConfig", "must be an object")
        return

    if not is_string(voice_config.get("source")):
        push_error(errors, "payload.voiceConfig.source", "must be a string")

    if not optional_string(voice_config.get("providerId")):
        push_error(
            errors,
            "payload.voiceConfig.providerId",
            "must be a string if provided",
        )

    if not optional_string(voice_config.get("voiceId")):
        push_error(errors, "payload.voiceConfig.voiceId", "must be a string if provided")

    if not optional_string(voice_config.get("userVoiceId")):
        push_error(
            errors,
            "payload.voiceConfig.userVoiceId",
            "must be a string if provided",
        )

    if not optional_string(voice_config.get("modelId")):
        push_error(errors, "payload.voiceConfig.modelId", "must be a string if provided")

    if not optional_string(voice_config.get("voiceName")):
        push_error(errors, "payload.voiceConfig.voiceName", "must be a string if provided")


def _validate_schema(schema: Any, errors: List[str]) -> Optional[str]:
    if not is_plain_object(schema):
        push_error(errors, "schema", "must be an object")
        return None

    if not is_string(schema.get("name")):
        push_error(errors, "schema.name", "must be a string")
    elif schema.get("name") != SCHEMA_NAME:
        push_error(errors, "schema.name", f'must be "{SCHEMA_NAME}"')

    if not is_string(schema.get("version")):
        push_error(errors, "schema.version", "must be a string")
    elif not is_known_version(schema.get("version")):
        push_error(errors, "schema.version", f'unknown version "{schema.get("version")}"')

    if schema.get("compat") is not None and not is_string(schema.get("compat")):
        push_error(errors, "schema.compat", "must be a string if provided")

    version = schema.get("version")
    return version if is_string(version) else None


def _validate_app_specific_settings(settings: Any, errors: List[str]) -> None:
    if settings is None:
        return

    if not is_plain_object(settings):
        push_error(errors, "app_specific_settings", "must be an object")


def _validate_meta(meta: Any, errors: List[str]) -> None:
    if meta is None:
        return

    if not is_plain_object(meta):
        push_error(errors, "meta", "must be an object")
        return

    if not optional_number(meta.get("createdAt")):
        push_error(errors, "meta.createdAt", "must be a number")

    if not optional_number(meta.get("updatedAt")):
        push_error(errors, "meta.updatedAt", "must be a number")

    if not optional_string(meta.get("source")):
        push_error(errors, "meta.source", "must be a string")

    if meta.get("authors") is not None and not (
        isinstance(meta.get("authors"), list)
        and all(is_string(item) for item in meta.get("authors", []))
    ):
        push_error(errors, "meta.authors", "must be an array of strings")

    if not optional_string(meta.get("license")):
        push_error(errors, "meta.license", "must be a string")


def _validate_meta_v2(meta: Any, errors: List[str], strict: bool) -> None:
    _validate_meta(meta, errors)

    if strict and not is_plain_object(meta):
        push_error(errors, "meta.originalCreatedAt", "is required in strict mode")
        push_error(errors, "meta.originalUpdatedAt", "is required in strict mode")
        return

    if not is_plain_object(meta):
        return

    if not optional_number(meta.get("originalCreatedAt")):
        push_error(errors, "meta.originalCreatedAt", "must be a number")

    if not optional_number(meta.get("originalUpdatedAt")):
        push_error(errors, "meta.originalUpdatedAt", "must be a number")

    if not optional_string(meta.get("originalSource")):
        push_error(errors, "meta.originalSource", "must be a string")

    if strict:
        if not is_number(meta.get("originalCreatedAt")):
            push_error(errors, "meta.originalCreatedAt", "is required in strict mode")
        if not is_number(meta.get("originalUpdatedAt")):
            push_error(errors, "meta.originalUpdatedAt", "is required in strict mode")


def _validate_character_payload_v1(payload: Any, errors: List[str], strict: bool) -> None:
    if not is_plain_object(payload):
        push_error(errors, "payload", "must be an object")
        return

    if not is_string(payload.get("id")):
        push_error(errors, "payload.id", "must be a string")

    if not is_string(payload.get("name")):
        push_error(errors, "payload.name", "must be a string")

    if not optional_string(payload.get("description")):
        push_error(errors, "payload.description", "must be a string")

    if not optional_string(payload.get("definitions")):
        push_error(errors, "payload.definitions", "must be a string")

    if not optional_string_list(payload.get("tags")):
        push_error(errors, "payload.tags", "must be an array of strings")

    if not optional_string(payload.get("avatar")):
        push_error(errors, "payload.avatar", "must be a string or null")

    if not optional_string(payload.get("chatBackground")):
        push_error(errors, "payload.chatBackground", "must be a string or null")

    if not optional_string_list(payload.get("rules")):
        push_error(errors, "payload.rules", "must be an array of strings")

    scenes = payload.get("scenes")
    if scenes is not None:
        if not isinstance(scenes, list):
            push_error(errors, "payload.scenes", "must be an array")
        else:
            for index, scene in enumerate(scenes):
                _validate_scene(scene, f"payload.scenes[{index}]", errors, strict)

    if not optional_string(payload.get("defaultSceneId")):
        push_error(errors, "payload.defaultSceneId", "must be a string or null")

    if not optional_string(payload.get("defaultModelId")):
        push_error(errors, "payload.defaultModelId", "must be a string or null")

    if not optional_string(payload.get("systemPrompt")):
        push_error(errors, "payload.systemPrompt", "must be a string or null")

    _validate_voice_config_v1(payload.get("voiceConfig"), errors)

    if not optional_boolean(payload.get("voiceAutoplay")):
        push_error(errors, "payload.voiceAutoplay", "must be a boolean")

    if not optional_number(payload.get("createdAt")):
        push_error(errors, "payload.createdAt", "must be a number")

    if not optional_number(payload.get("updatedAt")):
        push_error(errors, "payload.updatedAt", "must be a number")

    if strict:
        if not is_string(payload.get("description")):
            push_error(errors, "payload.description", "is required in strict mode")
        if not isinstance(payload.get("rules"), list):
            push_error(errors, "payload.rules", "is required in strict mode")
        if not isinstance(payload.get("scenes"), list):
            push_error(errors, "payload.scenes", "is required in strict mode")
        if not is_number(payload.get("createdAt")):
            push_error(errors, "payload.createdAt", "is required in strict mode")
        if not is_number(payload.get("updatedAt")):
            push_error(errors, "payload.updatedAt", "is required in strict mode")


def _validate_persona_payload_v1(payload: Any, errors: List[str], strict: bool) -> None:
    if not is_plain_object(payload):
        push_error(errors, "payload", "must be an object")
        return

    if not is_string(payload.get("id")):
        push_error(errors, "payload.id", "must be a string")

    if not is_string(payload.get("title")):
        push_error(errors, "payload.title", "must be a string")

    if not optional_string(payload.get("description")):
        push_error(errors, "payload.description", "must be a string")

    if not optional_string(payload.get("avatar")):
        push_error(errors, "payload.avatar", "must be a string or null")

    if not optional_boolean(payload.get("isDefault")):
        push_error(errors, "payload.isDefault", "must be a boolean")

    if not optional_number(payload.get("createdAt")):
        push_error(errors, "payload.createdAt", "must be a number")

    if not optional_number(payload.get("updatedAt")):
        push_error(errors, "payload.updatedAt", "must be a number")

    if strict:
        if not is_string(payload.get("description")):
            push_error(errors, "payload.description", "is required in strict mode")
        if not is_number(payload.get("createdAt")):
            push_error(errors, "payload.createdAt", "is required in strict mode")
        if not is_number(payload.get("updatedAt")):
            push_error(errors, "payload.updatedAt", "is required in strict mode")


def _validate_character_payload_v2(payload: Any, errors: List[str], strict: bool) -> None:
    if not is_plain_object(payload):
        push_error(errors, "payload", "must be an object")
        return

    if not is_string(payload.get("id")):
        push_error(errors, "payload.id", "must be a string")

    if not is_string(payload.get("name")):
        push_error(errors, "payload.name", "must be a string")

    if not optional_string(payload.get("description")):
        push_error(errors, "payload.description", "must be a string")

    if not optional_string(payload.get("definitions")):
        push_error(errors, "payload.definitions", "must be a string")

    if not optional_string_list(payload.get("tags")):
        push_error(errors, "payload.tags", "must be an array of strings")

    _validate_asset_locator(payload.get("avatar"), "payload.avatar", errors)
    _validate_asset_locator(payload.get("chatBackground"), "payload.chatBackground", errors)

    if strict and payload.get("rules") is not None:
        push_error(
            errors,
            "payload.rules",
            "is not a valid field in v2; use systemPrompt or characterBook instead",
        )

    if payload.get("scene") is not None:
        _validate_scene_v2(payload.get("scene"), "payload.scene", errors, strict)

    if not optional_string(payload.get("defaultModelId")):
        push_error(errors, "payload.defaultModelId", "must be a string or null")

    if not optional_string(payload.get("fallbackModelId")):
        push_error(errors, "payload.fallbackModelId", "must be a string or null")

    if not optional_string(payload.get("systemPrompt")):
        push_error(errors, "payload.systemPrompt", "must be a string or null")

    if not optional_string(payload.get("promptTemplateId")):
        push_error(errors, "payload.promptTemplateId", "must be a string or null")

    if not optional_string(payload.get("nickname")):
        push_error(errors, "payload.nickname", "must be a string or null")

    if not optional_string(payload.get("creator")):
        push_error(errors, "payload.creator", "must be a string or null")

    if not optional_string(payload.get("creatorNotes")):
        push_error(errors, "payload.creatorNotes", "must be a string or null")

    if not optional_object(payload.get("creatorNotesMultilingual")):
        push_error(
            errors,
            "payload.creatorNotesMultilingual",
            "must be an object if provided",
        )

    if payload.get("source") is not None and not (
        isinstance(payload.get("source"), list)
        and all(is_string(item) for item in payload.get("source", []))
    ):
        push_error(errors, "payload.source", "must be an array of strings")

    _validate_voice_config_v2(payload.get("voiceConfig"), errors)

    if not optional_boolean(payload.get("voiceAutoplay")):
        push_error(errors, "payload.voiceAutoplay", "must be a boolean")

    _validate_character_book(payload.get("characterBook"), errors)

    if not optional_number(payload.get("createdAt")):
        push_error(errors, "payload.createdAt", "must be a number")

    if not optional_number(payload.get("updatedAt")):
        push_error(errors, "payload.updatedAt", "must be a number")

    if strict:
        if not is_string(payload.get("description")):
            push_error(errors, "payload.description", "is required in strict mode")
        if not is_plain_object(payload.get("scene")):
            push_error(errors, "payload.scene", "is required in strict mode")
        if not is_number(payload.get("createdAt")):
            push_error(errors, "payload.createdAt", "is required in strict mode")
        if not is_number(payload.get("updatedAt")):
            push_error(errors, "payload.updatedAt", "is required in strict mode")


def _validate_persona_payload_v2(payload: Any, errors: List[str], strict: bool) -> None:
    if not is_plain_object(payload):
        push_error(errors, "payload", "must be an object")
        return

    if not is_string(payload.get("id")):
        push_error(errors, "payload.id", "must be a string")

    if not is_string(payload.get("title")):
        push_error(errors, "payload.title", "must be a string")

    if not optional_string(payload.get("description")):
        push_error(errors, "payload.description", "must be a string")

    _validate_asset_locator(payload.get("avatar"), "payload.avatar", errors)

    if not optional_boolean(payload.get("isDefault")):
        push_error(errors, "payload.isDefault", "must be a boolean")

    if not optional_number(payload.get("createdAt")):
        push_error(errors, "payload.createdAt", "must be a number")

    if not optional_number(payload.get("updatedAt")):
        push_error(errors, "payload.updatedAt", "must be a number")

    if strict:
        if not is_string(payload.get("description")):
            push_error(errors, "payload.description", "is required in strict mode")
        if not is_number(payload.get("createdAt")):
            push_error(errors, "payload.createdAt", "is required in strict mode")
        if not is_number(payload.get("updatedAt")):
            push_error(errors, "payload.updatedAt", "is required in strict mode")


def validate_uec(value: Any, strict: bool = False) -> ValidationResult:
    errors: List[str] = []

    if not is_plain_object(value):
        push_error(errors, "root", "must be an object")
        return ValidationResult(ok=False, errors=errors)

    version = _validate_schema(value.get("schema"), errors)

    if value.get("kind") not in {"character", "persona"}:
        push_error(errors, "kind", 'must be "character" or "persona"')

    is_v2 = version == SCHEMA_VERSION_V2
    has_known_version = is_known_version(version)

    payload = value.get("payload")
    if not is_plain_object(payload):
        push_error(errors, "payload", "must be an object")
    elif has_known_version:
        if value.get("kind") == "character":
            if is_v2:
                _validate_character_payload_v2(payload, errors, strict)
            else:
                _validate_character_payload_v1(payload, errors, strict)
        elif value.get("kind") == "persona":
            if is_v2:
                _validate_persona_payload_v2(payload, errors, strict)
            else:
                _validate_persona_payload_v1(payload, errors, strict)

    _validate_app_specific_settings(value.get("app_specific_settings"), errors)

    if is_v2 and has_known_version:
        _validate_meta_v2(value.get("meta"), errors, strict)
    else:
        _validate_meta(value.get("meta"), errors)

    if value.get("extensions") is not None and not is_plain_object(value.get("extensions")):
        push_error(errors, "extensions", "must be an object")

    return ValidationResult(ok=len(errors) == 0, errors=errors)


def validate_uec_strict(value: Any) -> ValidationResult:
    return validate_uec(value, strict=True)


def validate_uec_at_version(value: Any, version: str, strict: bool = False) -> ValidationResult:
    result = validate_uec(value, strict=strict)

    current = None
    if is_plain_object(value):
        schema = value.get("schema")
        if is_plain_object(schema):
            current = schema.get("version")

    if current != version:
        result.ok = False
        result.errors.append(
            f'schema.version: expected "{version}" but received "{current}"'
        )

    return result


def is_uec(value: Any, strict: bool = False) -> bool:
    return validate_uec(value, strict=strict).ok


def is_character_uec(value: Any, strict: bool = False) -> bool:
    return is_uec(value, strict=strict) and is_plain_object(value) and value.get("kind") == "character"


def is_persona_uec(value: Any, strict: bool = False) -> bool:
    return is_uec(value, strict=strict) and is_plain_object(value) and value.get("kind") == "persona"


def assert_uec(value: Any, strict: bool = False) -> Dict[str, Any]:
    result = validate_uec(value, strict=strict)
    if result.ok:
        return value
    raise ValueError(f"Invalid UEC: {'; '.join(result.errors)}")

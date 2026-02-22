from __future__ import annotations

from typing import Any, Dict, Optional

from .constants import SCHEMA_NAME, SCHEMA_VERSION, SCHEMA_VERSION_V2
from .utils import is_plain_object


def _normalize_system_prompt(payload: Dict[str, Any], system_prompt_is_id: bool) -> Dict[str, Any]:
    if not system_prompt_is_id:
        return payload

    system_prompt = payload.get("systemPrompt")
    if not isinstance(system_prompt, str):
        return payload

    if system_prompt.startswith("_ID:"):
        return payload

    next_payload = dict(payload)
    next_payload["systemPrompt"] = f"_ID:{system_prompt}"
    return next_payload


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

    if not is_plain_object(payload):
        raise ValueError("payload must be an object")

    schema = schema or {}
    is_v2 = schema.get("version") == SCHEMA_VERSION_V2

    base_schema = {
        "name": SCHEMA_NAME,
        "version": SCHEMA_VERSION_V2 if is_v2 else SCHEMA_VERSION,
    }
    base_schema.update(schema)

    normalized_payload = (
        _normalize_system_prompt(payload, system_prompt_is_id)
        if kind == "character" and not is_v2
        else payload
    )

    return {
        "schema": base_schema,
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
        kind="character",
        payload=payload,
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
        kind="persona",
        payload=payload,
        schema=schema,
        app_specific_settings=app_specific_settings,
        meta=meta,
        extensions=extensions,
    )


def create_character_uec_v2(
    payload: Dict[str, Any],
    schema: Optional[Dict[str, Any]] = None,
    app_specific_settings: Optional[Dict[str, Any]] = None,
    meta: Optional[Dict[str, Any]] = None,
    extensions: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    schema = dict(schema or {})
    schema["version"] = SCHEMA_VERSION_V2
    return create_uec(
        kind="character",
        payload=payload,
        schema=schema,
        app_specific_settings=app_specific_settings,
        meta=meta,
        extensions=extensions,
    )


def create_persona_uec_v2(
    payload: Dict[str, Any],
    schema: Optional[Dict[str, Any]] = None,
    app_specific_settings: Optional[Dict[str, Any]] = None,
    meta: Optional[Dict[str, Any]] = None,
    extensions: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    schema = dict(schema or {})
    schema["version"] = SCHEMA_VERSION_V2
    return create_uec(
        kind="persona",
        payload=payload,
        schema=schema,
        app_specific_settings=app_specific_settings,
        meta=meta,
        extensions=extensions,
    )

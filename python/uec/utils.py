from __future__ import annotations

from math import isfinite
from typing import Any, Dict, List

from .constants import KNOWN_VERSIONS


def is_plain_object(value: Any) -> bool:
    return isinstance(value, dict)


def is_string(value: Any) -> bool:
    return isinstance(value, str)


def is_number(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    if not isinstance(value, (int, float)):
        return False
    return isfinite(value)


def is_boolean(value: Any) -> bool:
    return isinstance(value, bool)


def optional_string(value: Any) -> bool:
    return value is None or is_string(value)


def optional_number(value: Any) -> bool:
    return value is None or is_number(value)


def optional_boolean(value: Any) -> bool:
    return value is None or is_boolean(value)


def optional_string_list(value: Any) -> bool:
    if value is None:
        return True
    return isinstance(value, list) and all(is_string(item) for item in value)


def optional_object(value: Any) -> bool:
    return value is None or is_plain_object(value)


def is_known_version(version: Any) -> bool:
    return is_string(version) and version in KNOWN_VERSIONS


def push_error(errors: List[str], path: str, message: str) -> None:
    errors.append(f"{path}: {message}")


def normalize_value(value: Any) -> Any:
    if isinstance(value, list):
        return [normalize_value(item) for item in value]
    if not is_plain_object(value):
        return value

    out: Dict[str, Any] = {}
    for key in sorted(value.keys()):
        item = value[key]
        if item is not None:
            out[key] = normalize_value(item)
        else:
            out[key] = None
    return out


def is_asset_locator_object(value: Any) -> bool:
    return is_plain_object(value) and value.get("type") in {
        "inline_base64",
        "remote_url",
        "asset_ref",
    }


def is_likely_asset_string(value: Any) -> bool:
    return is_string(value) and (
        value.startswith("http://")
        or value.startswith("https://")
        or value.startswith("data:")
    )

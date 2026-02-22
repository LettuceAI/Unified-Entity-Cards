from __future__ import annotations

import json
from typing import Any, Callable, Dict, List, Optional, Set

from .constants import SCHEMA_VERSION, SCHEMA_VERSION_V2
from .convert import convert_uec_v1_to_v2
from .types import (
    AssetReference,
    DiffEntry,
    DowngradeResult,
    LintResult,
    MergeOptions,
    MergeResult,
    ParseValidationResult,
)
from .utils import (
    is_asset_locator_object,
    is_likely_asset_string,
    is_number,
    is_plain_object,
    is_string,
    normalize_value,
)
from .validators import validate_uec, validate_uec_at_version as _validate_uec_at_version


def parse_uec(text: str, strict: bool = False) -> ParseValidationResult:
    if not isinstance(text, str):
        return ParseValidationResult(
            ok=False,
            value=None,
            errors=["root: json input must be a string"],
        )

    try:
        parsed = json.loads(text)
    except Exception as error:  # noqa: BLE001
        return ParseValidationResult(
            ok=False,
            value=None,
            errors=[f"root: invalid JSON ({error})"],
        )

    result = validate_uec(parsed, strict=strict)
    if not result.ok:
        return ParseValidationResult(ok=False, value=None, errors=result.errors)

    return ParseValidationResult(ok=True, value=parsed, errors=[])


def normalize_uec(card: Dict[str, Any]) -> Dict[str, Any]:
    normalized = normalize_value(card)
    if not is_plain_object(normalized):
        return normalized

    if not is_plain_object(normalized.get("app_specific_settings")):
        normalized["app_specific_settings"] = {}

    if not is_plain_object(normalized.get("meta")):
        normalized["meta"] = {}

    if not is_plain_object(normalized.get("extensions")):
        normalized["extensions"] = {}

    return normalized


def stringify_uec(card: Dict[str, Any], indent: int = 2) -> str:
    return json.dumps(normalize_uec(card), indent=indent, sort_keys=True)


def downgrade_uec(
    card: Dict[str, Any], target_version: str = SCHEMA_VERSION, keep_rules: bool = False
) -> DowngradeResult:
    if target_version != SCHEMA_VERSION:
        raise ValueError(f"unsupported target version: {target_version}")

    version = card.get("schema", {}).get("version")
    if version == SCHEMA_VERSION:
        return DowngradeResult(card=normalize_uec(card), warnings=[])

    if version != SCHEMA_VERSION_V2:
        raise ValueError(f"unsupported source version: {version}")

    warnings: List[str] = []
    next_card = dict(card)

    schema = dict(next_card.get("schema", {}))
    schema["version"] = SCHEMA_VERSION
    next_card["schema"] = schema

    payload = dict(next_card.get("payload", {}))

    scene = payload.pop("scene", None)
    if is_plain_object(scene):
        scene = dict(scene)
        if "selectedVariant" in scene:
            selected = scene.pop("selectedVariant")
            scene["selectedVariantId"] = None if selected == 0 else selected
        payload["scenes"] = [scene]
        if scene.get("id") is not None:
            payload["defaultSceneId"] = scene["id"]

    prompt_template_id = payload.pop("promptTemplateId", None)
    if prompt_template_id is not None:
        if payload.get("systemPrompt") is None:
            payload["systemPrompt"] = f"_ID:{prompt_template_id}"
        warnings.append(
            "payload.promptTemplateId was mapped to v1 systemPrompt and then removed"
        )

    removed_fields = [
        "fallbackModelId",
        "nickname",
        "creator",
        "creatorNotes",
        "creatorNotesMultilingual",
        "source",
        "characterBook",
    ]

    for field in removed_fields:
        if field in payload:
            payload.pop(field, None)
            warnings.append(f"payload.{field} is not supported in v1 and was removed")

    if not keep_rules and "rules" not in payload:
        payload["rules"] = []

    next_card["payload"] = payload

    meta = dict(next_card.get("meta", {}))
    if meta.pop("originalCreatedAt", None) is not None:
        warnings.append("meta.originalCreatedAt was removed for v1 compatibility")
    if meta.pop("originalUpdatedAt", None) is not None:
        warnings.append("meta.originalUpdatedAt was removed for v1 compatibility")
    if meta.pop("originalSource", None) is not None:
        warnings.append("meta.originalSource was removed for v1 compatibility")

    next_card["meta"] = meta

    return DowngradeResult(card=next_card, warnings=warnings)


def upgrade_uec(card: Dict[str, Any], target_version: str = SCHEMA_VERSION_V2) -> Dict[str, Any]:
    version = card.get("schema", {}).get("version")

    if target_version == SCHEMA_VERSION_V2:
        if version == SCHEMA_VERSION_V2:
            return normalize_uec(card)
        if version == SCHEMA_VERSION:
            return convert_uec_v1_to_v2(card)
        raise ValueError(f"unsupported source version: {version}")

    if target_version == SCHEMA_VERSION:
        return downgrade_uec(card, target_version).card

    raise ValueError(f"unsupported target version: {target_version}")


def _deep_equal(a: Any, b: Any) -> bool:
    if a is b:
        return True
    if type(a) is not type(b):
        return False
    if isinstance(a, list):
        return len(a) == len(b) and all(_deep_equal(x, y) for x, y in zip(a, b))
    if isinstance(a, dict):
        return set(a.keys()) == set(b.keys()) and all(
            _deep_equal(a[k], b[k]) for k in a.keys()
        )
    return a == b


def _walk_diff(a: Any, b: Any, path: str, out: List[DiffEntry]) -> None:
    if _deep_equal(a, b):
        return

    if isinstance(a, list) and isinstance(b, list):
        for idx in range(max(len(a), len(b))):
            av = a[idx] if idx < len(a) else None
            bv = b[idx] if idx < len(b) else None
            _walk_diff(av, bv, f"{path}[{idx}]", out)
        return

    if isinstance(a, dict) and isinstance(b, dict):
        keys = sorted(set(a.keys()) | set(b.keys()))
        for key in keys:
            next_path = f"{path}.{key}" if path else key
            if key not in a:
                out.append(DiffEntry(path=next_path, change_type="added", after=b[key]))
            elif key not in b:
                out.append(DiffEntry(path=next_path, change_type="removed", before=a[key]))
            else:
                _walk_diff(a[key], b[key], next_path, out)
        return

    out.append(DiffEntry(path=path or "root", change_type="changed", before=a, after=b))


def diff_uec(left: Dict[str, Any], right: Dict[str, Any]) -> List[DiffEntry]:
    out: List[DiffEntry] = []
    _walk_diff(normalize_uec(left), normalize_uec(right), "", out)
    return out


def _merge_values(
    base: Any,
    incoming: Any,
    path: str,
    options: MergeOptions,
    conflicts: Set[str],
) -> Any:
    if incoming is None:
        return base

    if base is None:
        return incoming

    if isinstance(base, list) and isinstance(incoming, list):
        if options.array == "concat":
            return [*base, *incoming]
        if not _deep_equal(base, incoming):
            conflicts.add(path or "root")
        return incoming

    if isinstance(base, dict) and isinstance(incoming, dict):
        out: Dict[str, Any] = {}
        for key in set(base.keys()) | set(incoming.keys()):
            next_path = f"{path}.{key}" if path else key
            out[key] = _merge_values(
                base.get(key), incoming.get(key), next_path, options, conflicts
            )
        return out

    if not _deep_equal(base, incoming):
        conflicts.add(path or "root")

    return base if options.conflict == "base" else incoming


def merge_uec(
    base: Dict[str, Any], incoming: Dict[str, Any], options: Optional[MergeOptions] = None
) -> MergeResult:
    options = options or MergeOptions()
    conflicts: Set[str] = set()
    value = _merge_values(base, incoming, "", options, conflicts)
    return MergeResult(value=value, conflicts=sorted(conflicts))


def validate_uec_strict(value: Any):
    return validate_uec(value, strict=True)


def validate_uec_at_version(value: Any, version: str, strict: bool = False):
    return _validate_uec_at_version(value, version, strict)


def extract_assets(card: Dict[str, Any]) -> List[AssetReference]:
    assets: List[AssetReference] = []

    def walk(value: Any, path: str) -> None:
        if is_likely_asset_string(value):
            assets.append(AssetReference(path=path, kind="string", value=value))
            return

        if is_asset_locator_object(value):
            assets.append(AssetReference(path=path, kind="locator", value=value))
            return

        if isinstance(value, list):
            for idx, item in enumerate(value):
                walk(item, f"{path}[{idx}]")
            return

        if isinstance(value, dict):
            for key, item in value.items():
                next_path = f"{path}.{key}" if path else key
                walk(item, next_path)

    walk(card, "")
    return assets


def rewrite_assets(card: Dict[str, Any], mapper: Callable[[AssetReference], Any]) -> Dict[str, Any]:
    def walk(value: Any, path: str) -> Any:
        if is_likely_asset_string(value):
            return mapper(AssetReference(path=path, kind="string", value=value))

        if is_asset_locator_object(value):
            return mapper(AssetReference(path=path, kind="locator", value=value))

        if isinstance(value, list):
            return [walk(item, f"{path}[{idx}]") for idx, item in enumerate(value)]

        if isinstance(value, dict):
            out: Dict[str, Any] = {}
            for key, item in value.items():
                next_path = f"{path}.{key}" if path else key
                out[key] = walk(item, next_path)
            return out

        return value

    return walk(card, "")


def lint_uec(card: Dict[str, Any]) -> LintResult:
    warnings: List[str] = []

    if not isinstance(card, dict):
        return LintResult(ok=False, warnings=["root: not a valid UEC object shape"])

    payload_raw = card.get("payload")
    if not isinstance(payload_raw, dict):
        return LintResult(ok=False, warnings=["root: not a valid UEC object shape"])
    payload: Dict[str, Any] = payload_raw

    description = payload.get("description")
    if isinstance(description, str) and not description.strip():
        warnings.append("payload.description is an empty string")

    payload_created_at = payload.get("createdAt")
    payload_updated_at = payload.get("updatedAt")
    if (
        isinstance(payload_created_at, (int, float))
        and not isinstance(payload_created_at, bool)
        and isinstance(payload_updated_at, (int, float))
        and not isinstance(payload_updated_at, bool)
    ):
        if payload_created_at > payload_updated_at:
            warnings.append("payload.createdAt is greater than payload.updatedAt")

    meta_raw = card.get("meta")
    if isinstance(meta_raw, dict):
        meta_created_at = meta_raw.get("createdAt")
        meta_updated_at = meta_raw.get("updatedAt")
        if (
            isinstance(meta_created_at, (int, float))
            and not isinstance(meta_created_at, bool)
            and isinstance(meta_updated_at, (int, float))
            and not isinstance(meta_updated_at, bool)
        ):
            if meta_created_at > meta_updated_at:
                warnings.append("meta.createdAt is greater than meta.updatedAt")

    scene = payload.get("scene")
    schema = card.get("schema")
    schema_version = schema.get("version") if isinstance(schema, dict) else None
    if (
        schema_version == SCHEMA_VERSION_V2
        and isinstance(scene, dict)
        and is_string(scene.get("selectedVariant"))
        and isinstance(scene.get("variants"), list)
    ):
        selected_variant = scene.get("selectedVariant")
        ids = {
            variant.get("id")
            for variant in scene["variants"]
            if is_plain_object(variant) and is_string(variant.get("id"))
        }
        if selected_variant not in ids:
            warnings.append("payload.scene.selectedVariant does not match any variant id")

    for asset in extract_assets(card):
        if (
            asset.kind == "locator"
            and is_plain_object(asset.value)
            and asset.value.get("type") == "inline_base64"
            and is_string(asset.value.get("data"))
            and len(asset.value["data"]) > 200000
        ):
            warnings.append(f"{asset.path}: inline_base64 asset is very large")

    return LintResult(ok=len(warnings) == 0, warnings=warnings)

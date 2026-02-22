import unittest

from uec import (
    SCHEMA_VERSION,
    SCHEMA_VERSION_V2,
    convert_uec_v1_to_v2,
    create_character_uec,
    create_character_uec_v2,
    create_persona_uec,
    diff_uec,
    downgrade_uec,
    extract_assets,
    is_character_uec,
    is_persona_uec,
    lint_uec,
    merge_uec,
    normalize_uec,
    parse_uec,
    rewrite_assets,
    upgrade_uec,
    validate_uec,
    validate_uec_at_version,
    validate_uec_strict,
)
from uec.types import MergeOptions


class TestUECV2AndTools(unittest.TestCase):
    def test_v2_strict_requires_meta_when_missing(self) -> None:
        card = {
            "schema": {"name": "UEC", "version": "2.0"},
            "kind": "character",
            "payload": {
                "id": "strict-missing-meta",
                "name": "Strict",
                "description": "desc",
                "scene": {"id": "s1", "content": "hello"},
                "createdAt": 1,
                "updatedAt": 2,
            },
        }

        result = validate_uec_strict(card)
        self.assertFalse(result.ok)
        self.assertTrue(any("meta.originalCreatedAt" in e for e in result.errors))
        self.assertTrue(any("meta.originalUpdatedAt" in e for e in result.errors))

    def test_unknown_version_skips_version_specific_payload_validation(self) -> None:
        card = {
            "schema": {"name": "UEC", "version": "9.9"},
            "kind": "character",
            "payload": {"id": "x"},
            "app_specific_settings": {},
            "meta": {},
            "extensions": {},
        }

        result = validate_uec(card)
        self.assertFalse(result.ok)
        self.assertTrue(any("unknown version" in e for e in result.errors))
        self.assertFalse(any("payload.name" in e for e in result.errors))

    def test_convert_rejects_non_v1_cards(self) -> None:
        v2 = {
            "schema": {"name": "UEC", "version": "2.0"},
            "kind": "character",
            "payload": {"id": "v2", "name": "Already V2"},
        }

        with self.assertRaises(ValueError):
            convert_uec_v1_to_v2(v2)

    def test_convert_removes_empty_scenes(self) -> None:
        v1 = create_character_uec({"id": "cv-empty", "name": "Test", "scenes": []})
        v2 = convert_uec_v1_to_v2(v1)
        self.assertNotIn("scenes", v2["payload"])
        self.assertNotIn("scene", v2["payload"])

    def test_parse_rejects_invalid_json(self) -> None:
        result = parse_uec("{ not-valid-json")
        self.assertFalse(result.ok)
        self.assertTrue(any("invalid JSON" in e for e in result.errors))

    def test_normalize_fills_top_level_optional_objects(self) -> None:
        raw = {
            "schema": {"name": "UEC", "version": "1.0"},
            "kind": "persona",
            "payload": {"id": "p1", "title": "Persona"},
        }
        normalized = normalize_uec(raw)
        self.assertIn("app_specific_settings", normalized)
        self.assertIn("meta", normalized)
        self.assertIn("extensions", normalized)

    def test_validate_at_version_reports_mismatch(self) -> None:
        card = create_character_uec_v2({"id": "ver", "name": "Versioned"})
        result = validate_uec_at_version(card, "1.0")
        self.assertFalse(result.ok)
        self.assertTrue(any("expected \"1.0\"" in e for e in result.errors))

    def test_merge_supports_base_conflict_strategy(self) -> None:
        base = {"a": 1, "nested": {"x": "base"}}
        incoming = {"a": 2, "nested": {"x": "incoming"}}
        merged = merge_uec(base, incoming, MergeOptions(conflict="base"))

        self.assertEqual(merged.value["a"], 1)
        self.assertEqual(merged.value["nested"]["x"], "base")
        self.assertIn("a", merged.conflicts)

    def test_diff_reports_changed_added_removed(self) -> None:
        left = {"a": 1, "nested": {"x": 1}, "gone": True}
        right = {"a": 2, "nested": {"x": 1}, "added": "yes"}

        diff = diff_uec(left, right)
        paths = {(item.path, item.change_type) for item in diff}

        self.assertIn(("a", "changed"), paths)
        self.assertIn(("added", "added"), paths)
        self.assertIn(("gone", "removed"), paths)

    def test_asset_helpers_extract_and_rewrite(self) -> None:
        card = {
            "schema": {"name": "UEC", "version": "2.0"},
            "kind": "character",
            "payload": {
                "id": "asset-helpers",
                "name": "Assets",
                "avatar": "https://example.com/a.png",
                "chatBackground": {
                    "type": "remote_url",
                    "url": "https://example.com/bg.png",
                },
            },
        }

        assets = extract_assets(card)
        self.assertTrue(any(a.path.endswith("payload.avatar") for a in assets))
        self.assertTrue(
            any(
                a.path.endswith("payload.chatBackground") and a.kind == "locator"
                for a in assets
            )
        )

        def mapper(asset):
            if asset.kind == "string":
                return asset.value.replace("example.com", "cdn.example.com")
            if asset.kind == "locator":
                out = dict(asset.value)
                if isinstance(out.get("url"), str):
                    out["url"] = out["url"].replace("example.com", "cdn.example.com")
                return out
            return asset.value

        rewritten = rewrite_assets(card, mapper)
        self.assertIn("cdn.example.com", rewritten["payload"]["avatar"])
        self.assertIn("cdn.example.com", rewritten["payload"]["chatBackground"]["url"])

    def test_lint_reports_quality_warnings(self) -> None:
        card = {
            "schema": {"name": "UEC", "version": "2.0"},
            "kind": "character",
            "payload": {
                "id": "lint-case",
                "name": "Lint",
                "description": " ",
                "createdAt": 10,
                "updatedAt": 1,
                "scene": {
                    "id": "s1",
                    "content": "c",
                    "selectedVariant": "missing",
                    "variants": [{"id": "v1", "content": "alt", "createdAt": 1}],
                },
            },
        }

        lint = lint_uec(card)
        self.assertFalse(lint.ok)
        self.assertTrue(any("empty string" in w for w in lint.warnings))
        self.assertTrue(any("createdAt" in w for w in lint.warnings))
        self.assertTrue(any("selectedVariant" in w for w in lint.warnings))

    def test_upgrade_and_downgrade_roundtrip(self) -> None:
        v2 = create_character_uec_v2({"id": "roundtrip", "name": "Roundtrip"})
        self.assertEqual(v2["schema"]["version"], SCHEMA_VERSION_V2)

        downgraded = downgrade_uec(v2)
        self.assertEqual(downgraded.card["schema"]["version"], SCHEMA_VERSION)

        upgraded = upgrade_uec(downgraded.card)
        self.assertEqual(upgraded["schema"]["version"], SCHEMA_VERSION_V2)

    def test_kind_predicates(self) -> None:
        character = {
            "schema": {"name": "UEC", "version": "1.0"},
            "kind": "character",
            "payload": {"id": "c1", "name": "C"},
        }
        persona = create_persona_uec({"id": "p1", "title": "P"})

        self.assertTrue(is_character_uec(character))
        self.assertFalse(is_persona_uec(character))
        self.assertFalse(is_character_uec(persona))
        self.assertTrue(is_persona_uec(persona))


if __name__ == "__main__":
    unittest.main()

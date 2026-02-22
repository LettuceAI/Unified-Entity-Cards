mod constants;
mod convert;
mod create;
mod tools;
mod types;
mod utils;
mod validators;

pub use constants::{SCHEMA_NAME, SCHEMA_VERSION, SCHEMA_VERSION_V2};
pub use convert::convert_uec_v1_to_v2;
pub use create::{
    create_character_uec, create_character_uec_v2, create_persona_uec, create_persona_uec_v2,
    create_uec,
};
pub use tools::{
    diff_uec, downgrade_uec, extract_assets, lint_uec, merge_uec, normalize_uec, parse_uec,
    rewrite_assets, stringify_uec, upgrade_uec,
};
pub use types::{
    AssetReference, DowngradeResult, LintResult, MergeOptions, MergeResult, ParseValidationResult,
    Uec, UecDiffEntry, UecKind, UecSchema, ValidationResult,
};
pub use validators::{
    assert_uec, is_character_uec, is_persona_uec, is_uec, validate_uec, validate_uec_at_version,
    validate_uec_strict,
};

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Map, Value};

    #[test]
    fn validates_v1_and_v2_minimal_cards() {
        let v1 = json!({
          "schema": { "name": "UEC", "version": "1.0" },
          "kind": "character",
          "payload": { "id": "char-1", "name": "Aster Vale" }
        });

        let v2 = json!({
          "schema": { "name": "UEC", "version": "2.0" },
          "kind": "persona",
          "payload": { "id": "per-1", "title": "Pragmatic Analyst" }
        });

        assert!(validate_uec(&v1, false).ok);
        assert!(validate_uec(&v2, false).ok);
    }

    #[test]
    fn rejects_unknown_schema_version() {
        let card = json!({
          "schema": { "name": "UEC", "version": "3.0" },
          "kind": "character",
          "payload": { "id": "x", "name": "X" },
          "app_specific_settings": {},
          "meta": {},
          "extensions": {}
        });

        let result = validate_uec(&card, false);
        assert!(!result.ok);
        assert!(result.errors.iter().any(|err| err.contains("unknown version")));
        assert!(!result.errors.iter().any(|err| err.contains("payload.name")));
    }

    #[test]
    fn create_character_uec_v2_builds_v2_schema() {
        let mut payload = Map::new();
        payload.insert("id".to_string(), Value::String("char-v2".to_string()));
        payload.insert("name".to_string(), Value::String("Aster".to_string()));

        let card = create_character_uec_v2(payload, None, None, None, None);
        assert_eq!(
            card.get("schema")
                .and_then(|schema| schema.get("version"))
                .and_then(Value::as_str),
            Some("2.0")
        );
    }

    #[test]
    fn strict_v2_requires_original_meta_fields() {
        let card = json!({
          "schema": { "name": "UEC", "version": "2.0" },
          "kind": "character",
          "payload": {
            "id": "s1",
            "name": "A",
            "description": "desc",
            "scene": { "id": "sc1", "content": "scene" },
            "createdAt": 1,
            "updatedAt": 2
          }
        });

        let result = validate_uec(&card, true);
        assert!(!result.ok);
        assert!(result
            .errors
            .iter()
            .any(|err| err.contains("meta.originalCreatedAt")));
    }

    #[test]
    fn convert_v1_to_v2_handles_scene_and_prompt_template() {
        let v1 = json!({
          "schema": { "name": "UEC", "version": "1.0" },
          "kind": "character",
          "payload": {
            "id": "cv1",
            "name": "Test",
            "scenes": [
              {
                "id": "scene-1",
                "content": "hello",
                "selectedVariantId": null
              }
            ],
            "defaultSceneId": "scene-1",
            "systemPrompt": "_ID:template-1",
            "rules": ["r1"]
          },
          "meta": {"createdAt": 1, "updatedAt": 2, "source": "src"}
        });

        let v2 = convert_uec_v1_to_v2(&v1).expect("conversion must succeed");

        assert_eq!(
            v2.get("schema")
                .and_then(|schema| schema.get("version"))
                .and_then(Value::as_str),
            Some("2.0")
        );

        let payload = v2.get("payload").and_then(Value::as_object).expect("payload object");
        assert!(!payload.contains_key("rules"));
        assert!(!payload.contains_key("scenes"));
        assert!(!payload.contains_key("defaultSceneId"));
        assert_eq!(
            payload
                .get("scene")
                .and_then(|scene| scene.get("selectedVariant"))
                .and_then(Value::as_i64),
            Some(0)
        );
        assert_eq!(
            payload.get("promptTemplateId").and_then(Value::as_str),
            Some("template-1")
        );

        let meta = v2.get("meta").and_then(Value::as_object).expect("meta object");
        assert_eq!(meta.get("originalCreatedAt").and_then(Value::as_i64), Some(1));
        assert_eq!(meta.get("originalUpdatedAt").and_then(Value::as_i64), Some(2));
        assert_eq!(meta.get("originalSource").and_then(Value::as_str), Some("src"));
    }

    #[test]
    fn parse_stringify_and_normalize_helpers_work() {
        let card = json!({
          "schema": { "version": "1.0", "name": "UEC" },
          "kind": "persona",
          "payload": { "id": "p1", "title": "Persona" }
        });

        let text = stringify_uec(&card, true).expect("serialize should work");
        let parsed = parse_uec(&text, false);
        assert!(parsed.ok);

        let normalized = normalize_uec(parsed.value.as_ref().expect("parsed value"));
        assert!(normalized.get("meta").is_some());
        assert!(normalized.get("extensions").is_some());
    }

    #[test]
    fn upgrade_and_downgrade_helpers_work() {
        let v1 = json!({
          "schema": { "name": "UEC", "version": "1.0" },
          "kind": "character",
          "payload": { "id": "u1", "name": "Upgrade" }
        });

        let upgraded = upgrade_uec(&v1, SCHEMA_VERSION_V2).expect("upgrade works");
        assert_eq!(
            upgraded
                .get("schema")
                .and_then(|schema| schema.get("version"))
                .and_then(Value::as_str),
            Some("2.0")
        );

        let downgraded = downgrade_uec(&upgraded, SCHEMA_VERSION, false).expect("downgrade works");
        assert_eq!(
            downgraded
                .card
                .get("schema")
                .and_then(|schema| schema.get("version"))
                .and_then(Value::as_str),
            Some("1.0")
        );
    }

    #[test]
    fn diff_and_merge_helpers_work() {
        let left = json!({"a": 1, "payload": {"title": "A"}});
        let right = json!({"a": 2, "payload": {"title": "B"}});

        let diff = diff_uec(&left, &right);
        assert!(!diff.is_empty());
        assert!(diff.iter().any(|entry| entry.path.contains("payload.title")));

        let merged = merge_uec(&left, &right, MergeOptions::default());
        assert_eq!(merged.value.get("a").and_then(Value::as_i64), Some(2));
        assert!(!merged.conflicts.is_empty());
    }

    #[test]
    fn extract_rewrite_and_lint_helpers_work() {
        let card = json!({
          "schema": { "name": "UEC", "version": "2.0" },
          "kind": "character",
          "payload": {
            "id": "asset-1",
            "name": "Asset",
            "description": " ",
            "createdAt": 20,
            "updatedAt": 10,
            "avatar": "https://example.com/avatar.png",
            "chatBackground": {
              "type": "remote_url",
              "url": "https://example.com/bg.png"
            },
            "scene": {
              "id": "scene-1",
              "content": "scene",
              "selectedVariant": "missing",
              "variants": [
                {"id": "v1", "content": "Variant", "createdAt": 1}
              ]
            }
          }
        });

        let assets = extract_assets(&card);
        assert!(assets.len() >= 2);

        let mut mapper = |asset: AssetReference| {
            if asset.kind == "string" {
                Value::String(
                    asset
                        .value
                        .as_str()
                        .unwrap_or_default()
                        .replace("example.com", "cdn.example.com"),
                )
            } else {
                asset.value
            }
        };

        let rewritten = rewrite_assets(&card, &mut mapper);
        assert!(rewritten
            .get("payload")
            .and_then(|payload| payload.get("avatar"))
            .and_then(Value::as_str)
            .is_some_and(|avatar| avatar.contains("cdn.example.com")));

        let lint = lint_uec(&card);
        assert!(!lint.ok);
        assert!(lint.warnings.iter().any(|warning| warning.contains("empty string")));
    }
}

use serde_json::{Map, Value, json};
use unified_entity_card::{
    MergeOptions, SCHEMA_VERSION, SCHEMA_VERSION_V2, convert_uec_v1_to_v2, create_character_uec,
    create_character_uec_v2, create_persona_uec, diff_uec, downgrade_uec, extract_assets,
    is_character_uec, is_persona_uec, lint_uec, merge_uec, normalize_uec, parse_uec,
    rewrite_assets, upgrade_uec, validate_uec, validate_uec_at_version, validate_uec_strict,
};

#[test]
fn v2_strict_requires_meta_when_missing() {
    let card = json!({
      "schema": { "name": "UEC", "version": "2.0" },
      "kind": "character",
      "payload": {
        "id": "strict-missing-meta",
        "name": "Strict",
        "description": "desc",
        "scene": { "id": "s1", "content": "hello" },
        "createdAt": 1,
        "updatedAt": 2
      }
    });

    let result = validate_uec_strict(&card);
    assert!(!result.ok);
    assert!(
        result
            .errors
            .iter()
            .any(|e| e.contains("meta.originalCreatedAt"))
    );
    assert!(
        result
            .errors
            .iter()
            .any(|e| e.contains("meta.originalUpdatedAt"))
    );
}

#[test]
fn unknown_schema_version_does_not_emit_payload_version_specific_errors() {
    let card = json!({
      "schema": { "name": "UEC", "version": "9.9" },
      "kind": "character",
      "payload": { "id": "x" },
      "app_specific_settings": {},
      "meta": {},
      "extensions": {}
    });

    let result = validate_uec(&card, false);
    assert!(!result.ok);
    assert!(result.errors.iter().any(|e| e.contains("unknown version")));
    assert!(!result.errors.iter().any(|e| e.contains("payload.name")));
}

#[test]
fn convert_rejects_non_v1_cards() {
    let v2 = json!({
      "schema": { "name": "UEC", "version": "2.0" },
      "kind": "character",
      "payload": { "id": "v2", "name": "Already V2" }
    });

    let err = convert_uec_v1_to_v2(&v2).expect_err("must reject v2 input");
    assert!(err.contains("schema version \"1.0\""));
}

#[test]
fn convert_removes_empty_scenes_array() {
    let mut payload = Map::new();
    payload.insert("id".to_string(), Value::String("cv-empty".to_string()));
    payload.insert("name".to_string(), Value::String("Test".to_string()));
    payload.insert("scenes".to_string(), Value::Array(vec![]));

    let v1 = create_character_uec(payload, false, None, None, None, None);
    let v2 = convert_uec_v1_to_v2(&v1).expect("conversion should succeed");

    let payload = v2
        .get("payload")
        .and_then(Value::as_object)
        .expect("payload object");
    assert!(!payload.contains_key("scenes"));
    assert!(!payload.contains_key("scene"));
}

#[test]
fn parse_uec_rejects_invalid_json() {
    let result = parse_uec("{ not-valid-json", false);
    assert!(!result.ok);
    assert!(
        result
            .errors
            .first()
            .is_some_and(|msg| msg.contains("invalid JSON"))
    );
}

#[test]
fn normalize_ensures_top_level_optional_objects() {
    let raw = json!({
      "schema": { "name": "UEC", "version": "1.0" },
      "kind": "persona",
      "payload": { "id": "p1", "title": "Persona" }
    });

    let normalized = normalize_uec(&raw);
    assert!(normalized.get("app_specific_settings").is_some());
    assert!(normalized.get("meta").is_some());
    assert!(normalized.get("extensions").is_some());
}

#[test]
fn validate_at_version_reports_mismatch() {
    let card = json!({
      "schema": { "name": "UEC", "version": "2.0" },
      "kind": "persona",
      "payload": { "id": "p2", "title": "Persona V2" }
    });

    let result = validate_uec_at_version(&card, "1.0", false);
    assert!(!result.ok);
    assert!(
        result
            .errors
            .iter()
            .any(|e| e.contains("expected \"1.0\" but received \"2.0\""))
    );
}

#[test]
fn merge_supports_base_conflict_strategy() {
    let base = json!({ "a": 1, "nested": { "x": "base" } });
    let incoming = json!({ "a": 2, "nested": { "x": "incoming" } });

    let options = MergeOptions {
        array: None,
        conflict: Some("base".to_string()),
    };
    let merged = merge_uec(&base, &incoming, options);

    assert_eq!(merged.value.get("a").and_then(Value::as_i64), Some(1));
    assert_eq!(
        merged
            .value
            .get("nested")
            .and_then(|n| n.get("x"))
            .and_then(Value::as_str),
        Some("base")
    );
    assert!(merged.conflicts.iter().any(|c| c == "a"));
}

#[test]
fn diff_reports_added_removed_and_changed_paths() {
    let left = json!({ "a": 1, "nested": { "x": 1 }, "gone": true });
    let right = json!({ "a": 2, "nested": { "x": 1 }, "added": "yes" });

    let diff = diff_uec(&left, &right);

    assert!(
        diff.iter()
            .any(|d| d.path == "a" && d.change_type == "changed")
    );
    assert!(
        diff.iter()
            .any(|d| d.path == "added" && d.change_type == "added")
    );
    assert!(
        diff.iter()
            .any(|d| d.path == "gone" && d.change_type == "removed")
    );
}

#[test]
fn asset_helpers_extract_and_rewrite_both_string_and_locator_assets() {
    let card = json!({
      "schema": { "name": "UEC", "version": "2.0" },
      "kind": "character",
      "payload": {
        "id": "asset-helpers",
        "name": "Assets",
        "avatar": "https://example.com/a.png",
        "chatBackground": {
          "type": "remote_url",
          "url": "https://example.com/bg.png"
        }
      }
    });

    let assets = extract_assets(&card);
    assert!(assets.iter().any(|a| a.path.ends_with("payload.avatar")));
    assert!(
        assets
            .iter()
            .any(|a| a.path.ends_with("payload.chatBackground") && a.kind == "locator")
    );

    let mut mapper = |asset: unified_entity_card::AssetReference| {
        if asset.kind == "string" {
            Value::String(
                asset
                    .value
                    .as_str()
                    .unwrap_or_default()
                    .replace("example.com", "cdn.example.com"),
            )
        } else if asset.kind == "locator" {
            let mut out = asset.value;
            let url = out
                .get("url")
                .and_then(Value::as_str)
                .map(ToOwned::to_owned);
            if let Some(url) = url {
                if let Some(obj) = out.as_object_mut() {
                    obj.insert(
                        "url".to_string(),
                        Value::String(url.replace("example.com", "cdn.example.com")),
                    );
                }
            }
            out
        } else {
            asset.value
        }
    };

    let rewritten = rewrite_assets(&card, &mut mapper);
    assert!(
        rewritten
            .get("payload")
            .and_then(|p| p.get("avatar"))
            .and_then(Value::as_str)
            .is_some_and(|v| v.contains("cdn.example.com"))
    );
    assert!(
        rewritten
            .get("payload")
            .and_then(|p| p.get("chatBackground"))
            .and_then(|bg| bg.get("url"))
            .and_then(Value::as_str)
            .is_some_and(|v| v.contains("cdn.example.com"))
    );
}

#[test]
fn lint_reports_common_quality_warnings() {
    let card = json!({
      "schema": { "name": "UEC", "version": "2.0" },
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
          "variants": [{ "id": "v1", "content": "alt", "createdAt": 1 }]
        }
      }
    });

    let lint = lint_uec(&card);
    assert!(!lint.ok);
    assert!(lint.warnings.iter().any(|w| w.contains("empty string")));
    assert!(lint.warnings.iter().any(|w| w.contains("createdAt")));
    assert!(
        lint.warnings
            .iter()
            .any(|w| w.contains("selectedVariant does not match"))
    );
}

#[test]
fn versioned_create_and_upgrade_downgrade_roundtrip() {
    let mut payload = Map::new();
    payload.insert("id".to_string(), Value::String("roundtrip".to_string()));
    payload.insert("name".to_string(), Value::String("Roundtrip".to_string()));

    let v2 = create_character_uec_v2(payload, None, None, None, None);
    assert_eq!(
        v2.get("schema")
            .and_then(|s| s.get("version"))
            .and_then(Value::as_str),
        Some(SCHEMA_VERSION_V2)
    );

    let downgraded = downgrade_uec(&v2, SCHEMA_VERSION, false).expect("downgrade");
    assert_eq!(
        downgraded
            .card
            .get("schema")
            .and_then(|s| s.get("version"))
            .and_then(Value::as_str),
        Some(SCHEMA_VERSION)
    );

    let upgraded = upgrade_uec(&downgraded.card, SCHEMA_VERSION_V2).expect("upgrade");
    assert_eq!(
        upgraded
            .get("schema")
            .and_then(|s| s.get("version"))
            .and_then(Value::as_str),
        Some(SCHEMA_VERSION_V2)
    );
}

#[test]
fn kind_type_predicates_are_correct() {
    let character = json!({
      "schema": { "name": "UEC", "version": "1.0" },
      "kind": "character",
      "payload": { "id": "c1", "name": "C" }
    });

    let persona = create_persona_uec(
        Map::from_iter([
            ("id".to_string(), Value::String("p1".to_string())),
            ("title".to_string(), Value::String("P".to_string())),
        ]),
        None,
        None,
        None,
        None,
    );

    assert!(is_character_uec(&character, false));
    assert!(!is_persona_uec(&character, false));
    assert!(!is_character_uec(&persona, false));
    assert!(is_persona_uec(&persona, false));
}

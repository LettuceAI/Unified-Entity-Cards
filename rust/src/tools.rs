use serde_json::{Map, Value};
use std::collections::BTreeSet;

use crate::constants::{SCHEMA_VERSION, SCHEMA_VERSION_V2};
use crate::convert::convert_uec_v1_to_v2;
use crate::types::{
    AssetReference, DowngradeResult, LintResult, MergeOptions, MergeResult, ParseValidationResult,
    UecDiffEntry,
};
use crate::utils::{is_asset_locator_object, is_likely_asset_string, is_object, normalize_value};
use crate::validators::validate_uec;

pub fn normalize_uec(card: &Value) -> Value {
    let mut normalized = normalize_value(card);

    if let Some(root) = normalized.as_object_mut() {
        if !root.get("app_specific_settings").is_some_and(is_object) {
            root.insert(
                "app_specific_settings".to_string(),
                Value::Object(Map::new()),
            );
        }

        if !root.get("meta").is_some_and(is_object) {
            root.insert("meta".to_string(), Value::Object(Map::new()));
        }

        if !root.get("extensions").is_some_and(is_object) {
            root.insert("extensions".to_string(), Value::Object(Map::new()));
        }
    }

    normalized
}

pub fn parse_uec(input: &str, strict: bool) -> ParseValidationResult {
    let parsed = match serde_json::from_str::<Value>(input) {
        Ok(value) => value,
        Err(error) => {
            return ParseValidationResult {
                ok: false,
                value: None,
                errors: vec![format!("root: invalid JSON ({})", error)],
            };
        }
    };

    let result = validate_uec(&parsed, strict);
    if result.ok {
        ParseValidationResult {
            ok: true,
            value: Some(parsed),
            errors: Vec::new(),
        }
    } else {
        ParseValidationResult {
            ok: false,
            value: None,
            errors: result.errors,
        }
    }
}

pub fn stringify_uec(card: &Value, pretty: bool) -> Result<String, String> {
    let normalized = normalize_uec(card);
    if pretty {
        serde_json::to_string_pretty(&normalized).map_err(|err| err.to_string())
    } else {
        serde_json::to_string(&normalized).map_err(|err| err.to_string())
    }
}

pub fn upgrade_uec(card: &Value, target_version: &str) -> Result<Value, String> {
    let version = card
        .get("schema")
        .and_then(|schema| schema.get("version"))
        .and_then(Value::as_str)
        .ok_or_else(|| "card must be an object with a schema".to_string())?;

    match target_version {
        SCHEMA_VERSION_V2 => {
            if version == SCHEMA_VERSION_V2 {
                Ok(normalize_uec(card))
            } else if version == SCHEMA_VERSION {
                convert_uec_v1_to_v2(card)
            } else {
                Err(format!("unsupported source version: {}", version))
            }
        }
        SCHEMA_VERSION => downgrade_uec(card, SCHEMA_VERSION, false).map(|result| result.card),
        _ => Err(format!("unsupported target version: {}", target_version)),
    }
}

pub fn downgrade_uec(
    card: &Value,
    target_version: &str,
    keep_rules: bool,
) -> Result<DowngradeResult, String> {
    if target_version != SCHEMA_VERSION {
        return Err(format!("unsupported target version: {}", target_version));
    }

    let version = card
        .get("schema")
        .and_then(|schema| schema.get("version"))
        .and_then(Value::as_str)
        .ok_or_else(|| "card must be an object with a schema".to_string())?;

    if version == SCHEMA_VERSION {
        return Ok(DowngradeResult {
            card: normalize_uec(card),
            warnings: Vec::new(),
        });
    }

    if version != SCHEMA_VERSION_V2 {
        return Err(format!("unsupported source version: {}", version));
    }

    let mut warnings = Vec::new();
    let mut next = card.clone();

    if let Some(schema) = next.get_mut("schema").and_then(Value::as_object_mut) {
        schema.insert(
            "version".to_string(),
            Value::String(SCHEMA_VERSION.to_string()),
        );
    }

    if let Some(payload) = next.get_mut("payload").and_then(Value::as_object_mut) {
        if let Some(scene) = payload.remove("scene")
            && let Value::Object(mut scene_map) = scene
        {
            if let Some(selected) = scene_map.remove("selectedVariant") {
                if matches!(selected, Value::Number(ref number) if number.as_i64() == Some(0)) {
                    scene_map.insert("selectedVariantId".to_string(), Value::Null);
                } else {
                    scene_map.insert("selectedVariantId".to_string(), selected);
                }
            }

            let scene_id = scene_map.get("id").cloned();
            payload.insert(
                "scenes".to_string(),
                Value::Array(vec![Value::Object(scene_map)]),
            );
            if let Some(id) = scene_id {
                payload.insert("defaultSceneId".to_string(), id);
            }
        }

        if let Some(prompt_template_id) = payload.remove("promptTemplateId") {
            if payload.get("systemPrompt").is_none_or(Value::is_null)
                && let Some(template_id) = prompt_template_id.as_str()
            {
                payload.insert(
                    "systemPrompt".to_string(),
                    Value::String(format!("_ID:{}", template_id)),
                );
            }
            warnings.push(
                "payload.promptTemplateId was mapped to v1 systemPrompt and then removed"
                    .to_string(),
            );
        }

        let removed_fields = [
            "fallbackModelId",
            "nickname",
            "creator",
            "creatorNotes",
            "creatorNotesMultilingual",
            "source",
            "characterBook",
        ];

        for field in removed_fields {
            if payload.remove(field).is_some() {
                warnings.push(format!(
                    "payload.{} is not supported in v1 and was removed",
                    field
                ));
            }
        }

        if !keep_rules && !payload.contains_key("rules") {
            payload.insert("rules".to_string(), Value::Array(Vec::new()));
        }
    }

    if let Some(meta) = next.get_mut("meta").and_then(Value::as_object_mut) {
        if meta.remove("originalCreatedAt").is_some() {
            warnings.push("meta.originalCreatedAt was removed for v1 compatibility".to_string());
        }
        if meta.remove("originalUpdatedAt").is_some() {
            warnings.push("meta.originalUpdatedAt was removed for v1 compatibility".to_string());
        }
        if meta.remove("originalSource").is_some() {
            warnings.push("meta.originalSource was removed for v1 compatibility".to_string());
        }
    }

    Ok(DowngradeResult {
        card: next,
        warnings,
    })
}

fn walk_diff(a: &Value, b: &Value, path: &str, out: &mut Vec<UecDiffEntry>) {
    if a == b {
        return;
    }

    match (a, b) {
        (Value::Array(left), Value::Array(right)) => {
            let max_len = left.len().max(right.len());
            for index in 0..max_len {
                let next_path = format!("{}[{}]", path, index);
                let left_value = left.get(index).unwrap_or(&Value::Null);
                let right_value = right.get(index).unwrap_or(&Value::Null);
                walk_diff(left_value, right_value, &next_path, out);
            }
        }
        (Value::Object(left), Value::Object(right)) => {
            let mut keys = BTreeSet::new();
            keys.extend(left.keys().cloned());
            keys.extend(right.keys().cloned());

            for key in keys {
                let next_path = if path.is_empty() {
                    key.clone()
                } else {
                    format!("{}.{}", path, key)
                };

                match (left.get(&key), right.get(&key)) {
                    (None, Some(after)) => out.push(UecDiffEntry {
                        path: next_path,
                        change_type: "added".to_string(),
                        before: None,
                        after: Some(after.clone()),
                    }),
                    (Some(before), None) => out.push(UecDiffEntry {
                        path: next_path,
                        change_type: "removed".to_string(),
                        before: Some(before.clone()),
                        after: None,
                    }),
                    (Some(before), Some(after)) => walk_diff(before, after, &next_path, out),
                    _ => {}
                }
            }
        }
        _ => out.push(UecDiffEntry {
            path: if path.is_empty() {
                "root".to_string()
            } else {
                path.to_string()
            },
            change_type: "changed".to_string(),
            before: Some(a.clone()),
            after: Some(b.clone()),
        }),
    }
}

pub fn diff_uec(left: &Value, right: &Value) -> Vec<UecDiffEntry> {
    let a = normalize_uec(left);
    let b = normalize_uec(right);
    let mut changes = Vec::new();
    walk_diff(&a, &b, "", &mut changes);
    changes
}

fn merge_values(
    base: &Value,
    incoming: &Value,
    path: &str,
    options: &MergeOptions,
    conflicts: &mut BTreeSet<String>,
) -> Value {
    if incoming.is_null() {
        return base.clone();
    }

    match (base, incoming) {
        (Value::Array(left), Value::Array(right)) => {
            if options.array.as_deref() == Some("concat") {
                let mut merged = left.clone();
                merged.extend(right.clone());
                Value::Array(merged)
            } else {
                if left != right {
                    conflicts.insert(path.to_string());
                }
                Value::Array(right.clone())
            }
        }
        (Value::Object(left), Value::Object(right)) => {
            let mut merged = Map::new();
            let mut keys = BTreeSet::new();
            keys.extend(left.keys().cloned());
            keys.extend(right.keys().cloned());

            for key in keys {
                let next_path = if path.is_empty() {
                    key.clone()
                } else {
                    format!("{}.{}", path, key)
                };

                let left_value = left.get(&key).unwrap_or(&Value::Null);
                let right_value = right.get(&key).unwrap_or(&Value::Null);

                let merged_value = if right.contains_key(&key) {
                    merge_values(left_value, right_value, &next_path, options, conflicts)
                } else {
                    left_value.clone()
                };

                merged.insert(key, merged_value);
            }

            Value::Object(merged)
        }
        _ => {
            if base != incoming {
                conflicts.insert(path.to_string());
            }

            if options.conflict.as_deref() == Some("base") {
                base.clone()
            } else {
                incoming.clone()
            }
        }
    }
}

pub fn merge_uec(base: &Value, incoming: &Value, options: MergeOptions) -> MergeResult {
    let mut conflicts = BTreeSet::new();
    let merged = merge_values(base, incoming, "", &options, &mut conflicts);
    MergeResult {
        value: merged,
        conflicts: conflicts
            .into_iter()
            .filter(|item| !item.is_empty())
            .collect(),
    }
}

fn extract_assets_walk(value: &Value, path: &str, assets: &mut Vec<AssetReference>) {
    if is_likely_asset_string(value) {
        assets.push(AssetReference {
            path: path.to_string(),
            kind: "string".to_string(),
            value: value.clone(),
        });
        return;
    }

    if is_object(value) && is_asset_locator_object(value) {
        assets.push(AssetReference {
            path: path.to_string(),
            kind: "locator".to_string(),
            value: value.clone(),
        });
        return;
    }

    match value {
        Value::Array(items) => {
            for (index, item) in items.iter().enumerate() {
                let next_path = format!("{}[{}]", path, index);
                extract_assets_walk(item, &next_path, assets);
            }
        }
        Value::Object(map) => {
            for (key, item) in map {
                let next_path = if path.is_empty() {
                    key.clone()
                } else {
                    format!("{}.{}", path, key)
                };
                extract_assets_walk(item, &next_path, assets);
            }
        }
        _ => {}
    }
}

pub fn extract_assets(card: &Value) -> Vec<AssetReference> {
    let mut assets = Vec::new();
    extract_assets_walk(card, "", &mut assets);
    assets
}

pub fn rewrite_assets<F>(card: &Value, mapper: &mut F) -> Value
where
    F: FnMut(AssetReference) -> Value,
{
    fn walk<F>(value: &Value, path: &str, mapper: &mut F) -> Value
    where
        F: FnMut(AssetReference) -> Value,
    {
        if is_likely_asset_string(value) {
            return mapper(AssetReference {
                path: path.to_string(),
                kind: "string".to_string(),
                value: value.clone(),
            });
        }

        if is_object(value) && is_asset_locator_object(value) {
            return mapper(AssetReference {
                path: path.to_string(),
                kind: "locator".to_string(),
                value: value.clone(),
            });
        }

        match value {
            Value::Array(items) => Value::Array(
                items
                    .iter()
                    .enumerate()
                    .map(|(index, item)| walk(item, &format!("{}[{}]", path, index), mapper))
                    .collect(),
            ),
            Value::Object(map) => {
                let mut out = Map::new();
                for (key, item) in map {
                    let next_path = if path.is_empty() {
                        key.clone()
                    } else {
                        format!("{}.{}", path, key)
                    };
                    out.insert(key.clone(), walk(item, &next_path, mapper));
                }
                Value::Object(out)
            }
            _ => value.clone(),
        }
    }

    walk(card, "", mapper)
}

pub fn lint_uec(card: &Value) -> LintResult {
    let mut warnings = Vec::new();

    let Some(payload) = card.get("payload").and_then(Value::as_object) else {
        return LintResult {
            ok: false,
            warnings: vec!["root: not a valid UEC object shape".to_string()],
        };
    };

    if payload
        .get("description")
        .and_then(Value::as_str)
        .is_some_and(|description| description.trim().is_empty())
    {
        warnings.push("payload.description is an empty string".to_string());
    }

    if payload
        .get("createdAt")
        .and_then(Value::as_i64)
        .zip(payload.get("updatedAt").and_then(Value::as_i64))
        .is_some_and(|(created, updated)| created > updated)
    {
        warnings.push("payload.createdAt is greater than payload.updatedAt".to_string());
    }

    if card
        .get("meta")
        .and_then(Value::as_object)
        .and_then(|meta| {
            meta.get("createdAt")
                .and_then(Value::as_i64)
                .zip(meta.get("updatedAt").and_then(Value::as_i64))
        })
        .is_some_and(|(created, updated)| created > updated)
    {
        warnings.push("meta.createdAt is greater than meta.updatedAt".to_string());
    }

    if card
        .get("schema")
        .and_then(|schema| schema.get("version"))
        .and_then(Value::as_str)
        == Some(SCHEMA_VERSION_V2)
        && let Some(scene) = payload.get("scene").and_then(Value::as_object)
        && let Some(selected_variant) = scene.get("selectedVariant").and_then(Value::as_str)
        && let Some(variants) = scene.get("variants").and_then(Value::as_array)
    {
        let known_ids: BTreeSet<String> = variants
            .iter()
            .filter_map(|variant| {
                variant
                    .as_object()
                    .and_then(|map| map.get("id"))
                    .and_then(Value::as_str)
                    .map(ToOwned::to_owned)
            })
            .collect();

        if !known_ids.contains(selected_variant) {
            warnings
                .push("payload.scene.selectedVariant does not match any variant id".to_string());
        }
    }

    for asset in extract_assets(card) {
        if asset.kind == "locator"
            && asset.value.get("type").and_then(Value::as_str) == Some("inline_base64")
            && asset
                .value
                .get("data")
                .and_then(Value::as_str)
                .is_some_and(|data| data.len() > 200_000)
        {
            warnings.push(format!("{}: inline_base64 asset is very large", asset.path));
        }
    }

    LintResult {
        ok: warnings.is_empty(),
        warnings,
    }
}

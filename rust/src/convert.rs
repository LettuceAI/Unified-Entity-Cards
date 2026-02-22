use serde_json::Value;

use crate::constants::{SCHEMA_VERSION, SCHEMA_VERSION_V2};
use crate::utils::{is_number, is_object, is_string};
use crate::validators::validate_uec;

pub fn convert_uec_v1_to_v2(card: &Value) -> Result<Value, String> {
    if !is_object(card) {
        return Err("card must be an object".to_string());
    }

    let validation = validate_uec(card, false);
    if !validation.ok {
        return Err(format!(
            "card must be a valid v1 UEC: {}",
            validation.errors.join("; ")
        ));
    }

    let version = card
        .get("schema")
        .and_then(|schema| schema.get("version"))
        .and_then(Value::as_str)
        .unwrap_or_default();

    if version != SCHEMA_VERSION {
        return Err(format!(
            "card must be schema version \"{}\" to convert",
            SCHEMA_VERSION
        ));
    }

    let mut next = card.clone();

    if let Some(schema) = next.get_mut("schema").and_then(Value::as_object_mut) {
        schema.insert(
            "version".to_string(),
            Value::String(SCHEMA_VERSION_V2.to_string()),
        );
    }

    if let Some(payload) = next.get_mut("payload").and_then(Value::as_object_mut) {
        payload.remove("rules");

        if let Some(scenes) = payload.get("scenes").cloned() {
            if let Value::Array(scene_items) = scenes
                && !scene_items.is_empty()
            {
                let default_id = payload.get("defaultSceneId").and_then(Value::as_str);

                let picked = default_id
                    .and_then(|id| {
                        scene_items.iter().find(|scene| {
                            scene
                                .get("id")
                                .and_then(Value::as_str)
                                .is_some_and(|scene_id| scene_id == id)
                        })
                    })
                    .or_else(|| scene_items.first());

                if let Some(Value::Object(picked_scene)) = picked {
                    let mut scene = picked_scene.clone();

                    if let Some(selected) = scene.remove("selectedVariantId") {
                        if selected.is_null() {
                            scene.insert("selectedVariant".to_string(), Value::Number(0.into()));
                        } else {
                            scene.insert("selectedVariant".to_string(), selected);
                        }
                    }

                    payload.insert("scene".to_string(), Value::Object(scene));
                }
            }
            payload.remove("scenes");
        }

        payload.remove("defaultSceneId");

        if let Some(Value::String(system_prompt)) = payload.get("systemPrompt").cloned()
            && let Some(stripped) = system_prompt.strip_prefix("_ID:")
        {
            payload.insert(
                "promptTemplateId".to_string(),
                Value::String(stripped.to_string()),
            );
            payload.insert("systemPrompt".to_string(), Value::Null);
        }
    }

    let meta = next
        .get_mut("meta")
        .and_then(Value::as_object_mut)
        .cloned()
        .unwrap_or_default();
    let mut new_meta = meta;

    if !new_meta.contains_key("originalCreatedAt")
        && let Some(created) = new_meta.get("createdAt").cloned()
        && is_number(&created)
    {
        new_meta.insert("originalCreatedAt".to_string(), created);
    }

    if !new_meta.contains_key("originalUpdatedAt")
        && let Some(updated) = new_meta.get("updatedAt").cloned()
        && is_number(&updated)
    {
        new_meta.insert("originalUpdatedAt".to_string(), updated);
    }

    if !new_meta.contains_key("originalSource")
        && let Some(source) = new_meta.get("source").cloned()
        && is_string(&source)
    {
        new_meta.insert("originalSource".to_string(), source);
    }

    if let Some(root) = next.as_object_mut() {
        root.insert("meta".to_string(), Value::Object(new_meta));
    }

    Ok(next)
}

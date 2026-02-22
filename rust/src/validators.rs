use serde_json::Value;

use crate::constants::{SCHEMA_NAME, SCHEMA_VERSION_V2};
use crate::types::{Uec, ValidationResult};
use crate::utils::{
    is_number, is_object, is_string, known_version, optional_boolean, optional_number,
    optional_object, optional_string, optional_string_array, push_error,
};

fn validate_asset_locator(value: Option<&Value>, path: &str, errors: &mut Vec<String>) {
    let Some(value) = value else {
        return;
    };

    if matches!(value, Value::Null | Value::String(_)) {
        return;
    }

    let Value::Object(map) = value else {
        push_error(errors, path, "must be a string, object, or null");
        return;
    };

    let valid_types = ["inline_base64", "remote_url", "asset_ref"];
    let value_type = map.get("type").and_then(Value::as_str);

    if !value_type.is_some_and(|t| valid_types.contains(&t)) {
        push_error(
            errors,
            &format!("{}.type", path),
            "must be one of: inline_base64, remote_url, asset_ref",
        );
        return;
    }

    if !optional_string(map.get("mimeType")) {
        push_error(errors, &format!("{}.mimeType", path), "must be a string if provided");
    }

    match value_type.unwrap_or_default() {
        "inline_base64" => {
            if !map.get("data").is_some_and(is_string) {
                push_error(errors, &format!("{}.data", path), "is required for inline_base64");
            }
        }
        "remote_url" => {
            if !map.get("url").is_some_and(is_string) {
                push_error(errors, &format!("{}.url", path), "is required for remote_url");
            }
        }
        "asset_ref" => {
            if !map.get("assetId").is_some_and(is_string) {
                push_error(errors, &format!("{}.assetId", path), "is required for asset_ref");
            }
        }
        _ => {}
    }
}

fn validate_character_book(book: Option<&Value>, errors: &mut Vec<String>) {
    let Some(book) = book else {
        return;
    };

    if matches!(book, Value::Null) {
        return;
    }

    let Value::Object(book_map) = book else {
        push_error(errors, "payload.characterBook", "must be an object");
        return;
    };

    if !optional_string(book_map.get("name")) {
        push_error(errors, "payload.characterBook.name", "must be a string or null");
    }

    if !optional_string(book_map.get("description")) {
        push_error(
            errors,
            "payload.characterBook.description",
            "must be a string or null",
        );
    }

    if let Some(entries) = book_map.get("entries") {
        let Value::Array(entries) = entries else {
            push_error(errors, "payload.characterBook.entries", "must be an array");
            return;
        };

        for (index, entry) in entries.iter().enumerate() {
            let entry_path = format!("payload.characterBook.entries[{}]", index);
            let Value::Object(entry_map) = entry else {
                push_error(errors, &entry_path, "must be an object");
                continue;
            };

            if !optional_string(entry_map.get("name")) {
                push_error(
                    errors,
                    &format!("{}.name", entry_path),
                    "must be a string or null",
                );
            }

            if let Some(keys) = entry_map.get("keys")
                && !matches!(keys, Value::Array(items) if items.iter().all(is_string))
            {
                push_error(
                    errors,
                    &format!("{}.keys", entry_path),
                    "must be an array of strings",
                );
            }

            if let Some(keys) = entry_map.get("secondary_keys")
                && !matches!(keys, Value::Array(items) if items.iter().all(is_string))
            {
                push_error(
                    errors,
                    &format!("{}.secondary_keys", entry_path),
                    "must be an array of strings",
                );
            }

            if !entry_map.get("content").is_some_and(is_string) {
                push_error(
                    errors,
                    &format!("{}.content", entry_path),
                    "must be a string",
                );
            }

            if !optional_boolean(entry_map.get("enabled")) {
                push_error(
                    errors,
                    &format!("{}.enabled", entry_path),
                    "must be a boolean",
                );
            }

            if !optional_number(entry_map.get("insertion_order")) {
                push_error(
                    errors,
                    &format!("{}.insertion_order", entry_path),
                    "must be a number",
                );
            }

            if !optional_boolean(entry_map.get("case_sensitive")) {
                push_error(
                    errors,
                    &format!("{}.case_sensitive", entry_path),
                    "must be a boolean",
                );
            }

            if !optional_number(entry_map.get("priority")) {
                push_error(
                    errors,
                    &format!("{}.priority", entry_path),
                    "must be a number",
                );
            }

            if !optional_boolean(entry_map.get("constant")) {
                push_error(
                    errors,
                    &format!("{}.constant", entry_path),
                    "must be a boolean",
                );
            }
        }
    }
}

fn validate_variant(variant: &Value, path: &str, errors: &mut Vec<String>) {
    let Value::Object(map) = variant else {
        push_error(errors, path, "must be an object");
        return;
    };

    if !map.get("id").is_some_and(is_string) {
        push_error(errors, &format!("{}.id", path), "must be a string");
    }

    if !map.get("content").is_some_and(is_string) {
        push_error(errors, &format!("{}.content", path), "must be a string");
    }

    if !map.get("createdAt").is_some_and(is_number) {
        push_error(errors, &format!("{}.createdAt", path), "must be a number");
    }
}

fn validate_scene_base(scene: &Value, path: &str, errors: &mut Vec<String>, strict: bool) -> bool {
    let Value::Object(map) = scene else {
        push_error(errors, path, "must be an object");
        return false;
    };

    if !map.get("id").is_some_and(is_string) {
        push_error(errors, &format!("{}.id", path), "must be a string");
    }

    if !map.get("content").is_some_and(is_string) {
        push_error(errors, &format!("{}.content", path), "must be a string");
    }

    if !optional_string(map.get("direction")) {
        push_error(errors, &format!("{}.direction", path), "must be a string");
    }

    if !optional_number(map.get("createdAt")) {
        push_error(errors, &format!("{}.createdAt", path), "must be a number");
    }

    if let Some(variants) = map.get("variants") {
        if let Value::Array(items) = variants {
            for (index, variant) in items.iter().enumerate() {
                validate_variant(variant, &format!("{}.variants[{}]", path, index), errors);
            }
        } else {
            push_error(errors, &format!("{}.variants", path), "must be an array");
        }
    }

    if strict {
        if !map.get("id").is_some_and(is_string) {
            push_error(errors, &format!("{}.id", path), "is required");
        }
        if !map.get("content").is_some_and(is_string) {
            push_error(errors, &format!("{}.content", path), "is required");
        }
    }

    true
}

fn validate_scene(scene: &Value, path: &str, errors: &mut Vec<String>, strict: bool) {
    if !validate_scene_base(scene, path, errors, strict) {
        return;
    }

    let Value::Object(map) = scene else {
        return;
    };

    if let Some(selected) = map.get("selectedVariantId")
        && !matches!(selected, Value::String(_) | Value::Null)
    {
        push_error(
            errors,
            &format!("{}.selectedVariantId", path),
            "must be a string or null",
        );
    }
}

fn validate_scene_v2(scene: &Value, path: &str, errors: &mut Vec<String>, strict: bool) {
    if !validate_scene_base(scene, path, errors, strict) {
        return;
    }

    let Value::Object(map) = scene else {
        return;
    };

    if let Some(selected) = map.get("selectedVariant")
        && !(matches!(selected, Value::Number(number) if number.as_i64() == Some(0))
            || matches!(selected, Value::String(_)))
    {
        push_error(
            errors,
            &format!("{}.selectedVariant", path),
            "must be 0 or a variant ID string",
        );
    }
}

fn validate_voice_config_v1(voice_config: Option<&Value>, errors: &mut Vec<String>) {
    let Some(voice_config) = voice_config else {
        return;
    };

    let Value::Object(map) = voice_config else {
        push_error(errors, "payload.voiceConfig", "must be an object");
        return;
    };

    if !map.get("source").is_some_and(is_string) {
        push_error(errors, "payload.voiceConfig.source", "must be a string");
    }

    if !map.get("providerId").is_some_and(is_string) {
        push_error(errors, "payload.voiceConfig.providerId", "must be a string");
    }

    if !map.get("voiceId").is_some_and(is_string) {
        push_error(errors, "payload.voiceConfig.voiceId", "must be a string");
    }
}

fn validate_voice_config_v2(voice_config: Option<&Value>, errors: &mut Vec<String>) {
    let Some(voice_config) = voice_config else {
        return;
    };

    let Value::Object(map) = voice_config else {
        push_error(errors, "payload.voiceConfig", "must be an object");
        return;
    };

    if !map.get("source").is_some_and(is_string) {
        push_error(errors, "payload.voiceConfig.source", "must be a string");
    }

    if !optional_string(map.get("providerId")) {
        push_error(
            errors,
            "payload.voiceConfig.providerId",
            "must be a string if provided",
        );
    }

    if !optional_string(map.get("voiceId")) {
        push_error(
            errors,
            "payload.voiceConfig.voiceId",
            "must be a string if provided",
        );
    }

    if !optional_string(map.get("userVoiceId")) {
        push_error(
            errors,
            "payload.voiceConfig.userVoiceId",
            "must be a string if provided",
        );
    }

    if !optional_string(map.get("modelId")) {
        push_error(
            errors,
            "payload.voiceConfig.modelId",
            "must be a string if provided",
        );
    }

    if !optional_string(map.get("voiceName")) {
        push_error(
            errors,
            "payload.voiceConfig.voiceName",
            "must be a string if provided",
        );
    }
}

fn validate_schema(schema: Option<&Value>, errors: &mut Vec<String>) -> Option<String> {
    let Some(schema) = schema else {
        push_error(errors, "schema", "must be an object");
        return None;
    };

    let Value::Object(map) = schema else {
        push_error(errors, "schema", "must be an object");
        return None;
    };

    let name = map.get("name");
    if !name.is_some_and(is_string) {
        push_error(errors, "schema.name", "must be a string");
    } else if name.and_then(Value::as_str) != Some(SCHEMA_NAME) {
        push_error(errors, "schema.name", "must be \"UEC\"");
    }

    let version = map.get("version");
    if !version.is_some_and(is_string) {
        push_error(errors, "schema.version", "must be a string");
    } else if !known_version(version.and_then(Value::as_str).unwrap_or_default()) {
        push_error(
            errors,
            "schema.version",
            &format!(
                "unknown version \"{}\"",
                version.and_then(Value::as_str).unwrap_or_default()
            ),
        );
    }

    if let Some(compat) = map.get("compat") && !is_string(compat) {
        push_error(errors, "schema.compat", "must be a string if provided");
    }

    version.and_then(Value::as_str).map(ToOwned::to_owned)
}

fn validate_app_specific_settings(settings: Option<&Value>, errors: &mut Vec<String>) {
    if settings.is_none() {
        return;
    }

    if !settings.is_some_and(is_object) {
        push_error(errors, "app_specific_settings", "must be an object");
    }
}

fn validate_meta(meta: Option<&Value>, errors: &mut Vec<String>) {
    if meta.is_none() {
        return;
    }

    let Some(Value::Object(map)) = meta else {
        push_error(errors, "meta", "must be an object");
        return;
    };

    if !optional_number(map.get("createdAt")) {
        push_error(errors, "meta.createdAt", "must be a number");
    }

    if !optional_number(map.get("updatedAt")) {
        push_error(errors, "meta.updatedAt", "must be a number");
    }

    if !optional_string(map.get("source")) {
        push_error(errors, "meta.source", "must be a string");
    }

    if let Some(authors) = map.get("authors") {
        if let Value::Array(items) = authors {
            if !items.iter().all(is_string) {
                push_error(errors, "meta.authors", "must be an array of strings");
            }
        } else {
            push_error(errors, "meta.authors", "must be an array of strings");
        }
    }

    if !optional_string(map.get("license")) {
        push_error(errors, "meta.license", "must be a string");
    }
}

fn validate_meta_v2(meta: Option<&Value>, errors: &mut Vec<String>, strict: bool) {
    validate_meta(meta, errors);

    if strict && !meta.is_some_and(is_object) {
        push_error(errors, "meta.originalCreatedAt", "is required in strict mode");
        push_error(errors, "meta.originalUpdatedAt", "is required in strict mode");
        return;
    }

    let Some(Value::Object(map)) = meta else {
        return;
    };

    if !optional_number(map.get("originalCreatedAt")) {
        push_error(errors, "meta.originalCreatedAt", "must be a number");
    }

    if !optional_number(map.get("originalUpdatedAt")) {
        push_error(errors, "meta.originalUpdatedAt", "must be a number");
    }

    if !optional_string(map.get("originalSource")) {
        push_error(errors, "meta.originalSource", "must be a string");
    }

    if strict {
        if !map.get("originalCreatedAt").is_some_and(is_number) {
            push_error(errors, "meta.originalCreatedAt", "is required in strict mode");
        }

        if !map.get("originalUpdatedAt").is_some_and(is_number) {
            push_error(errors, "meta.originalUpdatedAt", "is required in strict mode");
        }
    }
}

fn validate_character_payload_v1(payload: &Value, errors: &mut Vec<String>, strict: bool) {
    let Value::Object(map) = payload else {
        push_error(errors, "payload", "must be an object");
        return;
    };

    if !map.get("id").is_some_and(is_string) {
        push_error(errors, "payload.id", "must be a string");
    }

    if !map.get("name").is_some_and(is_string) {
        push_error(errors, "payload.name", "must be a string");
    }

    if !optional_string(map.get("description")) {
        push_error(errors, "payload.description", "must be a string");
    }

    if !optional_string(map.get("definitions")) {
        push_error(errors, "payload.definitions", "must be a string");
    }

    if !optional_string_array(map.get("tags")) {
        push_error(errors, "payload.tags", "must be an array of strings");
    }

    if !optional_string(map.get("avatar")) {
        push_error(errors, "payload.avatar", "must be a string or null");
    }

    if !optional_string(map.get("chatBackground")) {
        push_error(errors, "payload.chatBackground", "must be a string or null");
    }

    if !optional_string_array(map.get("rules")) {
        push_error(errors, "payload.rules", "must be an array of strings");
    }

    if let Some(Value::Array(scenes)) = map.get("scenes") {
        for (index, scene) in scenes.iter().enumerate() {
            validate_scene(scene, &format!("payload.scenes[{}]", index), errors, strict);
        }
    } else if map.get("scenes").is_some() {
        push_error(errors, "payload.scenes", "must be an array");
    }

    if !optional_string(map.get("defaultSceneId")) {
        push_error(errors, "payload.defaultSceneId", "must be a string or null");
    }

    if !optional_string(map.get("defaultModelId")) {
        push_error(errors, "payload.defaultModelId", "must be a string or null");
    }

    if !optional_string(map.get("systemPrompt")) {
        push_error(errors, "payload.systemPrompt", "must be a string or null");
    }

    validate_voice_config_v1(map.get("voiceConfig"), errors);

    if !optional_boolean(map.get("voiceAutoplay")) {
        push_error(errors, "payload.voiceAutoplay", "must be a boolean");
    }

    if !optional_number(map.get("createdAt")) {
        push_error(errors, "payload.createdAt", "must be a number");
    }

    if !optional_number(map.get("updatedAt")) {
        push_error(errors, "payload.updatedAt", "must be a number");
    }

    if strict {
        if !map.get("description").is_some_and(is_string) {
            push_error(errors, "payload.description", "is required in strict mode");
        }

        if !matches!(map.get("rules"), Some(Value::Array(_))) {
            push_error(errors, "payload.rules", "is required in strict mode");
        }

        if !matches!(map.get("scenes"), Some(Value::Array(_))) {
            push_error(errors, "payload.scenes", "is required in strict mode");
        }

        if !map.get("createdAt").is_some_and(is_number) {
            push_error(errors, "payload.createdAt", "is required in strict mode");
        }

        if !map.get("updatedAt").is_some_and(is_number) {
            push_error(errors, "payload.updatedAt", "is required in strict mode");
        }
    }
}

fn validate_persona_payload_v1(payload: &Value, errors: &mut Vec<String>, strict: bool) {
    let Value::Object(map) = payload else {
        push_error(errors, "payload", "must be an object");
        return;
    };

    if !map.get("id").is_some_and(is_string) {
        push_error(errors, "payload.id", "must be a string");
    }

    if !map.get("title").is_some_and(is_string) {
        push_error(errors, "payload.title", "must be a string");
    }

    if !optional_string(map.get("description")) {
        push_error(errors, "payload.description", "must be a string");
    }

    if !optional_string(map.get("avatar")) {
        push_error(errors, "payload.avatar", "must be a string or null");
    }

    if !optional_boolean(map.get("isDefault")) {
        push_error(errors, "payload.isDefault", "must be a boolean");
    }

    if !optional_number(map.get("createdAt")) {
        push_error(errors, "payload.createdAt", "must be a number");
    }

    if !optional_number(map.get("updatedAt")) {
        push_error(errors, "payload.updatedAt", "must be a number");
    }

    if strict {
        if !map.get("description").is_some_and(is_string) {
            push_error(errors, "payload.description", "is required in strict mode");
        }

        if !map.get("createdAt").is_some_and(is_number) {
            push_error(errors, "payload.createdAt", "is required in strict mode");
        }

        if !map.get("updatedAt").is_some_and(is_number) {
            push_error(errors, "payload.updatedAt", "is required in strict mode");
        }
    }
}

fn validate_character_payload_v2(payload: &Value, errors: &mut Vec<String>, strict: bool) {
    let Value::Object(map) = payload else {
        push_error(errors, "payload", "must be an object");
        return;
    };

    if !map.get("id").is_some_and(is_string) {
        push_error(errors, "payload.id", "must be a string");
    }

    if !map.get("name").is_some_and(is_string) {
        push_error(errors, "payload.name", "must be a string");
    }

    if !optional_string(map.get("description")) {
        push_error(errors, "payload.description", "must be a string");
    }

    if !optional_string(map.get("definitions")) {
        push_error(errors, "payload.definitions", "must be a string");
    }

    if !optional_string_array(map.get("tags")) {
        push_error(errors, "payload.tags", "must be an array of strings");
    }

    validate_asset_locator(map.get("avatar"), "payload.avatar", errors);
    validate_asset_locator(map.get("chatBackground"), "payload.chatBackground", errors);

    if strict && map.get("rules").is_some() {
        push_error(
            errors,
            "payload.rules",
            "is not a valid field in v2; use systemPrompt or characterBook instead",
        );
    }

    if let Some(scene) = map.get("scene") && !matches!(scene, Value::Null) {
        validate_scene_v2(scene, "payload.scene", errors, strict);
    }

    if !optional_string(map.get("defaultModelId")) {
        push_error(errors, "payload.defaultModelId", "must be a string or null");
    }

    if !optional_string(map.get("fallbackModelId")) {
        push_error(errors, "payload.fallbackModelId", "must be a string or null");
    }

    if !optional_string(map.get("systemPrompt")) {
        push_error(errors, "payload.systemPrompt", "must be a string or null");
    }

    if !optional_string(map.get("promptTemplateId")) {
        push_error(errors, "payload.promptTemplateId", "must be a string or null");
    }

    if !optional_string(map.get("nickname")) {
        push_error(errors, "payload.nickname", "must be a string or null");
    }

    if !optional_string(map.get("creator")) {
        push_error(errors, "payload.creator", "must be a string or null");
    }

    if !optional_string(map.get("creatorNotes")) {
        push_error(errors, "payload.creatorNotes", "must be a string or null");
    }

    if !optional_object(map.get("creatorNotesMultilingual")) {
        push_error(
            errors,
            "payload.creatorNotesMultilingual",
            "must be an object if provided",
        );
    }

    if let Some(source) = map.get("source")
        && !matches!(source, Value::Array(items) if items.iter().all(is_string))
    {
        push_error(errors, "payload.source", "must be an array of strings");
    }

    validate_voice_config_v2(map.get("voiceConfig"), errors);

    if !optional_boolean(map.get("voiceAutoplay")) {
        push_error(errors, "payload.voiceAutoplay", "must be a boolean");
    }

    validate_character_book(map.get("characterBook"), errors);

    if !optional_number(map.get("createdAt")) {
        push_error(errors, "payload.createdAt", "must be a number");
    }

    if !optional_number(map.get("updatedAt")) {
        push_error(errors, "payload.updatedAt", "must be a number");
    }

    if strict {
        if !map.get("description").is_some_and(is_string) {
            push_error(errors, "payload.description", "is required in strict mode");
        }

        if !map.get("scene").is_some_and(is_object) {
            push_error(errors, "payload.scene", "is required in strict mode");
        }

        if !map.get("createdAt").is_some_and(is_number) {
            push_error(errors, "payload.createdAt", "is required in strict mode");
        }

        if !map.get("updatedAt").is_some_and(is_number) {
            push_error(errors, "payload.updatedAt", "is required in strict mode");
        }
    }
}

fn validate_persona_payload_v2(payload: &Value, errors: &mut Vec<String>, strict: bool) {
    let Value::Object(map) = payload else {
        push_error(errors, "payload", "must be an object");
        return;
    };

    if !map.get("id").is_some_and(is_string) {
        push_error(errors, "payload.id", "must be a string");
    }

    if !map.get("title").is_some_and(is_string) {
        push_error(errors, "payload.title", "must be a string");
    }

    if !optional_string(map.get("description")) {
        push_error(errors, "payload.description", "must be a string");
    }

    validate_asset_locator(map.get("avatar"), "payload.avatar", errors);

    if !optional_boolean(map.get("isDefault")) {
        push_error(errors, "payload.isDefault", "must be a boolean");
    }

    if !optional_number(map.get("createdAt")) {
        push_error(errors, "payload.createdAt", "must be a number");
    }

    if !optional_number(map.get("updatedAt")) {
        push_error(errors, "payload.updatedAt", "must be a number");
    }

    if strict {
        if !map.get("description").is_some_and(is_string) {
            push_error(errors, "payload.description", "is required in strict mode");
        }

        if !map.get("createdAt").is_some_and(is_number) {
            push_error(errors, "payload.createdAt", "is required in strict mode");
        }

        if !map.get("updatedAt").is_some_and(is_number) {
            push_error(errors, "payload.updatedAt", "is required in strict mode");
        }
    }
}

pub fn validate_uec(value: &Value, strict: bool) -> ValidationResult {
    let mut errors = Vec::new();

    let Value::Object(map) = value else {
        push_error(&mut errors, "root", "must be an object");
        return ValidationResult { ok: false, errors };
    };

    let version = validate_schema(map.get("schema"), &mut errors);

    match map.get("kind") {
        Some(Value::String(kind)) if kind == "character" || kind == "persona" => {}
        _ => push_error(&mut errors, "kind", "must be \"character\" or \"persona\""),
    }

    let is_v2 = version.as_deref() == Some(SCHEMA_VERSION_V2);
    let known_version = version.as_deref().is_some_and(known_version);

    match map.get("payload") {
        Some(payload) if is_object(payload) => {
            if known_version {
                if let Some(kind) = map.get("kind").and_then(Value::as_str) {
                    if kind == "character" {
                        if is_v2 {
                            validate_character_payload_v2(payload, &mut errors, strict);
                        } else {
                            validate_character_payload_v1(payload, &mut errors, strict);
                        }
                    } else if kind == "persona" {
                        if is_v2 {
                            validate_persona_payload_v2(payload, &mut errors, strict);
                        } else {
                            validate_persona_payload_v1(payload, &mut errors, strict);
                        }
                    }
                }
            }
        }
        _ => push_error(&mut errors, "payload", "must be an object"),
    }

    validate_app_specific_settings(map.get("app_specific_settings"), &mut errors);

    if is_v2 && known_version {
        validate_meta_v2(map.get("meta"), &mut errors, strict);
    } else {
        validate_meta(map.get("meta"), &mut errors);
    }

    if let Some(extensions) = map.get("extensions") && !is_object(extensions) {
        push_error(&mut errors, "extensions", "must be an object");
    }

    ValidationResult {
        ok: errors.is_empty(),
        errors,
    }
}

pub fn validate_uec_strict(value: &Value) -> ValidationResult {
    validate_uec(value, true)
}

pub fn validate_uec_at_version(value: &Value, version: &str, strict: bool) -> ValidationResult {
    let mut result = validate_uec(value, strict);

    if let Some(current) = value
        .get("schema")
        .and_then(|schema| schema.get("version"))
        .and_then(Value::as_str)
        && current != version
    {
        result.ok = false;
        result.errors.push(format!(
            "schema.version: expected \"{}\" but received \"{}\"",
            version, current
        ));
    }

    result
}

pub fn is_uec(value: &Value, strict: bool) -> bool {
    validate_uec(value, strict).ok
}

pub fn is_character_uec(value: &Value, strict: bool) -> bool {
    is_uec(value, strict)
        && value
            .get("kind")
            .and_then(Value::as_str)
            .is_some_and(|kind| kind == "character")
}

pub fn is_persona_uec(value: &Value, strict: bool) -> bool {
    is_uec(value, strict)
        && value
            .get("kind")
            .and_then(Value::as_str)
            .is_some_and(|kind| kind == "persona")
}

pub fn assert_uec(value: &Value, strict: bool) -> Result<Uec, String> {
    let result = validate_uec(value, strict);
    if result.ok {
        serde_json::from_value(value.clone()).map_err(|err| format!("Invalid UEC: {}", err))
    } else {
        Err(format!("Invalid UEC: {}", result.errors.join("; ")))
    }
}

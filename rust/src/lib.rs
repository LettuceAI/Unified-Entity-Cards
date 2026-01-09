use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

pub const SCHEMA_NAME: &str = "UEC";
pub const SCHEMA_VERSION: &str = "1.0";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UecSchema {
    pub name: String,
    pub version: String,
    pub compat: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum UecKind {
    Character,
    Persona,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Uec {
    pub schema: UecSchema,
    pub kind: UecKind,
    pub payload: Value,
    #[serde(rename = "app_specific_settings")]
    pub app_specific_settings: Option<Value>,
    pub meta: Option<Value>,
    pub extensions: Option<Value>,
}

#[derive(Debug, Clone)]
pub struct ValidationResult {
    pub ok: bool,
    pub errors: Vec<String>,
}

fn is_string(value: &Value) -> bool {
    matches!(value, Value::String(_))
}

fn is_number(value: &Value) -> bool {
    match value {
        Value::Number(number) => number.is_f64() || number.is_i64() || number.is_u64(),
        _ => false,
    }
}

fn is_boolean(value: &Value) -> bool {
    matches!(value, Value::Bool(_))
}

fn is_object(value: &Value) -> bool {
    matches!(value, Value::Object(_))
}

fn optional_string(value: Option<&Value>) -> bool {
    matches!(value, None | Some(Value::Null) | Some(Value::String(_)))
}

fn optional_number(value: Option<&Value>) -> bool {
    matches!(value, None) || value.map_or(false, is_number)
}

fn optional_boolean(value: Option<&Value>) -> bool {
    matches!(value, None) || value.map_or(false, is_boolean)
}

fn optional_string_array(value: Option<&Value>) -> bool {
    match value {
        None | Some(Value::Null) => true,
        Some(Value::Array(items)) => items.iter().all(is_string),
        _ => false,
    }
}

fn push_error(errors: &mut Vec<String>, path: &str, message: &str) {
    errors.push(format!("{}: {}", path, message));
}

fn validate_variant(variant: &Value, path: &str, errors: &mut Vec<String>) {
    let Value::Object(map) = variant else {
        push_error(errors, path, "must be an object");
        return;
    };

    if !map.get("id").map_or(false, is_string) {
        push_error(errors, &format!("{}.id", path), "must be a string");
    }

    if !map.get("content").map_or(false, is_string) {
        push_error(errors, &format!("{}.content", path), "must be a string");
    }

    if !map.get("createdAt").map_or(false, is_number) {
        push_error(errors, &format!("{}.createdAt", path), "must be a number");
    }
}

fn validate_schema(schema: Option<&Value>, errors: &mut Vec<String>) {
    let Some(schema) = schema else {
        push_error(errors, "schema", "must be an object");
        return;
    };

    let Value::Object(map) = schema else {
        push_error(errors, "schema", "must be an object");
        return;
    };

    let name = map.get("name");
    if !name.map_or(false, is_string) {
        push_error(errors, "schema.name", "must be a string");
    } else if name.and_then(|value| value.as_str()) != Some(SCHEMA_NAME) {
        push_error(errors, "schema.name", "must be \"UEC\"");
    }

    if !map.get("version").map_or(false, is_string) {
        push_error(errors, "schema.version", "must be a string");
    }

    if let Some(compat) = map.get("compat") {
        if !is_string(compat) {
            push_error(errors, "schema.compat", "must be a string if provided");
        }
    }
}

fn validate_app_specific_settings(settings: Option<&Value>, errors: &mut Vec<String>) {
    if settings.is_none() {
        return;
    }

    if !settings.map_or(false, is_object) {
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

fn validate_scene(scene: &Value, path: &str, errors: &mut Vec<String>, strict: bool) {
    let Value::Object(map) = scene else {
        push_error(errors, path, "must be an object");
        return;
    };

    if !map.get("id").map_or(false, is_string) {
        push_error(errors, &format!("{}.id", path), "must be a string");
    }

    if !map.get("content").map_or(false, is_string) {
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

    if let Some(selected) = map.get("selectedVariantId") {
        if !matches!(selected, Value::String(_) | Value::Null) {
            push_error(
                errors,
                &format!("{}.selectedVariantId", path),
                "must be a string or null",
            );
        }
    }

    if strict {
        if !map.get("id").map_or(false, is_string) {
            push_error(errors, &format!("{}.id", path), "is required");
        }
        if !map.get("content").map_or(false, is_string) {
            push_error(errors, &format!("{}.content", path), "is required");
        }
    }
}

fn validate_voice_config(voice_config: Option<&Value>, errors: &mut Vec<String>) {
    let Some(voice_config) = voice_config else {
        return;
    };

    let Value::Object(map) = voice_config else {
        push_error(errors, "payload.voiceConfig", "must be an object");
        return;
    };

    if !map.get("source").map_or(false, is_string) {
        push_error(errors, "payload.voiceConfig.source", "must be a string");
    }

    if !map.get("providerId").map_or(false, is_string) {
        push_error(errors, "payload.voiceConfig.providerId", "must be a string");
    }

    if !map.get("voiceId").map_or(false, is_string) {
        push_error(errors, "payload.voiceConfig.voiceId", "must be a string");
    }
}

fn validate_character_payload(payload: &Value, errors: &mut Vec<String>, strict: bool) {
    let Value::Object(map) = payload else {
        push_error(errors, "payload", "must be an object");
        return;
    };

    if !map.get("id").map_or(false, is_string) {
        push_error(errors, "payload.id", "must be a string");
    }

    if !map.get("name").map_or(false, is_string) {
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
    } else if map.get("scenes").is_some() && !matches!(map.get("scenes"), Some(Value::Array(_))) {
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

    validate_voice_config(map.get("voiceConfig"), errors);

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
        if !map.get("description").map_or(false, is_string) {
            push_error(errors, "payload.description", "is required in strict mode");
        }

        if !matches!(map.get("rules"), Some(Value::Array(_))) {
            push_error(errors, "payload.rules", "is required in strict mode");
        }

        if !matches!(map.get("scenes"), Some(Value::Array(_))) {
            push_error(errors, "payload.scenes", "is required in strict mode");
        }

        if !map.get("createdAt").map_or(false, is_number) {
            push_error(errors, "payload.createdAt", "is required in strict mode");
        }

        if !map.get("updatedAt").map_or(false, is_number) {
            push_error(errors, "payload.updatedAt", "is required in strict mode");
        }
    }
}

fn validate_persona_payload(payload: &Value, errors: &mut Vec<String>, strict: bool) {
    let Value::Object(map) = payload else {
        push_error(errors, "payload", "must be an object");
        return;
    };

    if !map.get("id").map_or(false, is_string) {
        push_error(errors, "payload.id", "must be a string");
    }

    if !map.get("title").map_or(false, is_string) {
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
        if !map.get("description").map_or(false, is_string) {
            push_error(errors, "payload.description", "is required in strict mode");
        }

        if !map.get("createdAt").map_or(false, is_number) {
            push_error(errors, "payload.createdAt", "is required in strict mode");
        }

        if !map.get("updatedAt").map_or(false, is_number) {
            push_error(errors, "payload.updatedAt", "is required in strict mode");
        }
    }
}

pub fn create_uec(
    kind: &str,
    payload: Value,
    schema: Option<Map<String, Value>>,
    app_specific_settings: Option<Value>,
    meta: Option<Value>,
    extensions: Option<Value>,
) -> Value {
    if kind.is_empty() {
        panic!("kind is required");
    }

    if !matches!(payload, Value::Object(_)) {
        panic!("payload must be an object");
    }

    let mut schema_value = Map::from_iter([
        ("name".to_string(), Value::String(SCHEMA_NAME.to_string())),
        (
            "version".to_string(),
            Value::String(SCHEMA_VERSION.to_string()),
        ),
    ]);

    if let Some(custom_schema) = schema {
        for (key, value) in custom_schema {
            schema_value.insert(key, value);
        }
    }

    let mut root = Map::new();
    root.insert("schema".to_string(), Value::Object(schema_value));
    root.insert("kind".to_string(), Value::String(kind.to_string()));
    root.insert("payload".to_string(), payload);
    root.insert(
        "app_specific_settings".to_string(),
        app_specific_settings.unwrap_or(Value::Object(Map::new())),
    );
    root.insert(
        "meta".to_string(),
        meta.unwrap_or(Value::Object(Map::new())),
    );
    root.insert(
        "extensions".to_string(),
        extensions.unwrap_or(Value::Object(Map::new())),
    );

    Value::Object(root)
}

pub fn create_character_uec(
    mut payload: Map<String, Value>,
    system_prompt_is_id: bool,
    schema: Option<Map<String, Value>>,
    app_specific_settings: Option<Value>,
    meta: Option<Value>,
    extensions: Option<Value>,
) -> Value {
    if system_prompt_is_id {
        if let Some(Value::String(prompt)) = payload.get("systemPrompt").cloned() {
            if !prompt.starts_with("_ID:") {
                payload.insert(
                    "systemPrompt".to_string(),
                    Value::String(format!("_ID:{}", prompt)),
                );
            }
        }
    }

    create_uec(
        "character",
        Value::Object(payload),
        schema,
        app_specific_settings,
        meta,
        extensions,
    )
}

pub fn create_persona_uec(
    payload: Map<String, Value>,
    schema: Option<Map<String, Value>>,
    app_specific_settings: Option<Value>,
    meta: Option<Value>,
    extensions: Option<Value>,
) -> Value {
    create_uec(
        "persona",
        Value::Object(payload),
        schema,
        app_specific_settings,
        meta,
        extensions,
    )
}

pub fn validate_uec(value: &Value, strict: bool) -> ValidationResult {
    let mut errors = Vec::new();

    let Value::Object(map) = value else {
        push_error(&mut errors, "root", "must be an object");
        return ValidationResult { ok: false, errors };
    };

    validate_schema(map.get("schema"), &mut errors);

    match map.get("kind") {
        Some(Value::String(kind)) if kind == "character" || kind == "persona" => {}
        _ => push_error(&mut errors, "kind", "must be \"character\" or \"persona\""),
    }

    match map.get("payload") {
        Some(payload) => {
            if let Some(kind) = map.get("kind").and_then(|value| value.as_str()) {
                if kind == "character" {
                    validate_character_payload(payload, &mut errors, strict);
                } else if kind == "persona" {
                    validate_persona_payload(payload, &mut errors, strict);
                }
            }
        }
        None => push_error(&mut errors, "payload", "must be an object"),
    }

    validate_app_specific_settings(map.get("app_specific_settings"), &mut errors);
    validate_meta(map.get("meta"), &mut errors);

    if let Some(extensions) = map.get("extensions") {
        if !is_object(extensions) {
            push_error(&mut errors, "extensions", "must be an object");
        }
    }

    ValidationResult {
        ok: errors.is_empty(),
        errors,
    }
}

pub fn is_uec(value: &Value, strict: bool) -> bool {
    validate_uec(value, strict).ok
}

pub fn assert_uec(value: &Value, strict: bool) -> Result<Uec, String> {
    let result = validate_uec(value, strict);
    if result.ok {
        serde_json::from_value(value.clone()).map_err(|err| format!("Invalid UEC: {}", err))
    } else {
        Err(format!("Invalid UEC: {}", result.errors.join("; ")))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Map, Value};

    #[test]
    fn validates_minimal_character_non_strict() {
        let card = json!({
          "schema": { "name": "UEC", "version": "1.0" },
          "kind": "character",
          "payload": { "id": "char-1", "name": "Aster Vale" }
        });

        let result = validate_uec(&card, false);
        assert!(result.ok);
        assert!(result.errors.is_empty());
    }

    #[test]
    fn strict_requires_fields() {
        let card = json!({
          "schema": { "name": "UEC", "version": "1.0" },
          "kind": "character",
          "payload": { "id": "char-2", "name": "Aster Vale" }
        });

        let result = validate_uec(&card, true);
        assert!(!result.ok);
        assert!(!result.errors.is_empty());
    }

    #[test]
    fn app_specific_settings_must_be_object() {
        let card = json!({
          "schema": { "name": "UEC", "version": "1.0" },
          "kind": "persona",
          "payload": { "id": "per-1", "title": "Pragmatic Analyst" },
          "app_specific_settings": "nope"
        });

        let result = validate_uec(&card, false);
        assert!(!result.ok);
        assert!(result
            .errors
            .iter()
            .any(|err| err.contains("app_specific_settings")));
    }

    #[test]
    fn assert_uec_returns_error() {
        let card = json!({
          "schema": { "name": "UEC", "version": "1.0" },
          "kind": "persona",
          "payload": { "id": "per-2" }
        });

        assert!(assert_uec(&card, false).is_err());
    }

    #[test]
    fn assert_uec_returns_typed_object() {
        let card = json!({
          "schema": { "name": "UEC", "version": "1.0" },
          "kind": "persona",
          "payload": { "id": "per-3", "title": "Pragmatic Analyst" }
        });

        let uec = assert_uec(&card, false).expect("expected a valid UEC");
        assert_eq!(uec.kind, UecKind::Persona);
    }

    #[test]
    fn create_character_uec_prefixes_system_prompt() {
        let mut payload = Map::new();
        payload.insert("id".to_string(), Value::String("char-4".to_string()));
        payload.insert("name".to_string(), Value::String("Aster Vale".to_string()));
        payload.insert(
            "systemPrompt".to_string(),
            Value::String("template-1".to_string()),
        );

        let card = create_character_uec(payload, true, None, None, None, None);
        let system_prompt = card
            .get("payload")
            .and_then(|value| value.get("systemPrompt"))
            .and_then(|value| value.as_str());

        assert_eq!(system_prompt, Some("_ID:template-1"));
    }

    #[test]
    fn validates_scene_variants() {
        let card = json!({
          "schema": { "name": "UEC", "version": "1.0" },
          "kind": "character",
          "payload": {
            "id": "char-5",
            "name": "Aster Vale",
            "scenes": [
              {
                "id": "scene-1",
                "content": "You step into the Archive of Echoes.",
                "variants": [
                  {
                    "id": "variant-1",
                    "content": "You step into the Archive, where every echo is logged.",
                    "createdAt": 1715100001
                  }
                ]
              }
            ]
          }
        });

        let result = validate_uec(&card, false);
        assert!(result.ok);

        let invalid = json!({
          "schema": { "name": "UEC", "version": "1.0" },
          "kind": "character",
          "payload": {
            "id": "char-6",
            "name": "Aster Vale",
            "scenes": [
              {
                "id": "scene-2",
                "content": "You step into the Archive of Echoes.",
                "variants": [
                  { "content": "Missing id and createdAt" }
                ]
              }
            ]
          }
        });

        let invalid_result = validate_uec(&invalid, false);
        assert!(!invalid_result.ok);
        assert!(invalid_result
            .errors
            .iter()
            .any(|err| err.contains("variants[0].id")));
    }
}

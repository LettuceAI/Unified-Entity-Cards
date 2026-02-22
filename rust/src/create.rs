use serde_json::{Map, Value};

use crate::constants::{SCHEMA_NAME, SCHEMA_VERSION, SCHEMA_VERSION_V2};
use crate::utils::{is_object, is_string};

fn normalize_system_prompt(payload: &Value, system_prompt_is_id: bool) -> Value {
    if !system_prompt_is_id {
        return payload.clone();
    }

    let Value::Object(map) = payload else {
        return payload.clone();
    };

    let Some(Value::String(prompt)) = map.get("systemPrompt") else {
        return payload.clone();
    };

    if prompt.starts_with("_ID:") {
        return payload.clone();
    }

    let mut next = map.clone();
    next.insert(
        "systemPrompt".to_string(),
        Value::String(format!("_ID:{}", prompt)),
    );
    Value::Object(next)
}

pub fn create_uec(
    kind: &str,
    payload: Value,
    schema: Option<Map<String, Value>>,
    app_specific_settings: Option<Value>,
    meta: Option<Value>,
    extensions: Option<Value>,
    system_prompt_is_id: bool,
) -> Value {
    assert!(!kind.is_empty(), "kind is required");
    assert!(is_object(&payload), "payload must be an object");

    let is_v2 = schema
        .as_ref()
        .and_then(|s| s.get("version"))
        .and_then(Value::as_str)
        == Some(SCHEMA_VERSION_V2);

    let mut schema_value = Map::from_iter([
        ("name".to_string(), Value::String(SCHEMA_NAME.to_string())),
        (
            "version".to_string(),
            Value::String((if is_v2 { SCHEMA_VERSION_V2 } else { SCHEMA_VERSION }).to_string()),
        ),
    ]);

    if let Some(custom_schema) = schema {
        for (key, value) in custom_schema {
            schema_value.insert(key, value);
        }
    }

    let normalized_payload = if kind == "character" && !is_v2 {
        normalize_system_prompt(&payload, system_prompt_is_id)
    } else {
        payload
    };

    let mut root = Map::new();
    root.insert("schema".to_string(), Value::Object(schema_value));
    root.insert("kind".to_string(), Value::String(kind.to_string()));
    root.insert("payload".to_string(), normalized_payload);
    root.insert(
        "app_specific_settings".to_string(),
        app_specific_settings.unwrap_or(Value::Object(Map::new())),
    );
    root.insert("meta".to_string(), meta.unwrap_or(Value::Object(Map::new())));
    root.insert(
        "extensions".to_string(),
        extensions.unwrap_or(Value::Object(Map::new())),
    );

    Value::Object(root)
}

pub fn create_character_uec(
    payload: Map<String, Value>,
    system_prompt_is_id: bool,
    schema: Option<Map<String, Value>>,
    app_specific_settings: Option<Value>,
    meta: Option<Value>,
    extensions: Option<Value>,
) -> Value {
    create_uec(
        "character",
        Value::Object(payload),
        schema,
        app_specific_settings,
        meta,
        extensions,
        system_prompt_is_id,
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
        false,
    )
}

pub fn create_character_uec_v2(
    payload: Map<String, Value>,
    mut schema: Option<Map<String, Value>>,
    app_specific_settings: Option<Value>,
    meta: Option<Value>,
    extensions: Option<Value>,
) -> Value {
    let mut schema_map = schema.take().unwrap_or_default();
    schema_map.insert("version".to_string(), Value::String(SCHEMA_VERSION_V2.to_string()));

    create_uec(
        "character",
        Value::Object(payload),
        Some(schema_map),
        app_specific_settings,
        meta,
        extensions,
        false,
    )
}

pub fn create_persona_uec_v2(
    payload: Map<String, Value>,
    mut schema: Option<Map<String, Value>>,
    app_specific_settings: Option<Value>,
    meta: Option<Value>,
    extensions: Option<Value>,
) -> Value {
    let mut schema_map = schema.take().unwrap_or_default();
    schema_map.insert("version".to_string(), Value::String(SCHEMA_VERSION_V2.to_string()));

    create_uec(
        "persona",
        Value::Object(payload),
        Some(schema_map),
        app_specific_settings,
        meta,
        extensions,
        false,
    )
}

pub fn _system_prompt_is_id(payload: &Value) -> bool {
    payload
        .get("systemPrompt")
        .and_then(Value::as_str)
        .is_some_and(|prompt| is_string(&Value::String(prompt.to_string())) && prompt.starts_with("_ID:"))
}

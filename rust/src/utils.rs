use serde_json::{Map, Value};
use std::collections::BTreeMap;

pub(crate) fn is_string(value: &Value) -> bool {
    matches!(value, Value::String(_))
}

pub(crate) fn is_number(value: &Value) -> bool {
    match value {
        Value::Number(number) => number.is_f64() || number.is_i64() || number.is_u64(),
        _ => false,
    }
}

pub(crate) fn is_boolean(value: &Value) -> bool {
    matches!(value, Value::Bool(_))
}

pub(crate) fn is_object(value: &Value) -> bool {
    matches!(value, Value::Object(_))
}

pub(crate) fn optional_string(value: Option<&Value>) -> bool {
    matches!(value, None | Some(Value::Null) | Some(Value::String(_)))
}

pub(crate) fn optional_number(value: Option<&Value>) -> bool {
    matches!(value, None) || value.is_some_and(is_number)
}

pub(crate) fn optional_boolean(value: Option<&Value>) -> bool {
    matches!(value, None) || value.is_some_and(is_boolean)
}

pub(crate) fn optional_object(value: Option<&Value>) -> bool {
    matches!(value, None) || value.is_some_and(is_object)
}

pub(crate) fn optional_string_array(value: Option<&Value>) -> bool {
    match value {
        None => true,
        Some(Value::Array(items)) => items.iter().all(is_string),
        _ => false,
    }
}

pub(crate) fn known_version(version: &str) -> bool {
    version == crate::constants::SCHEMA_VERSION || version == crate::constants::SCHEMA_VERSION_V2
}

pub(crate) fn push_error(errors: &mut Vec<String>, path: &str, message: &str) {
    errors.push(format!("{}: {}", path, message));
}

pub(crate) fn normalize_value(value: &Value) -> Value {
    match value {
        Value::Array(items) => Value::Array(items.iter().map(normalize_value).collect()),
        Value::Object(map) => {
            let mut sorted = BTreeMap::new();
            for (key, item) in map {
                sorted.insert(key.clone(), normalize_value(item));
            }

            let mut out = Map::new();
            for (key, item) in sorted {
                out.insert(key, item);
            }
            Value::Object(out)
        }
        _ => value.clone(),
    }
}

pub(crate) fn is_asset_locator_object(value: &Value) -> bool {
    value
        .get("type")
        .and_then(Value::as_str)
        .is_some_and(|value_type| {
            value_type == "inline_base64" || value_type == "remote_url" || value_type == "asset_ref"
        })
}

pub(crate) fn is_likely_asset_string(value: &Value) -> bool {
    value.as_str().is_some_and(|content| {
        content.starts_with("http://")
            || content.starts_with("https://")
            || content.starts_with("data:")
    })
}

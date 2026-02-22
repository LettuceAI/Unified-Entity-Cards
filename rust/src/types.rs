use serde::{Deserialize, Serialize};
use serde_json::Value;

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

#[derive(Debug, Clone)]
pub struct ParseValidationResult {
    pub ok: bool,
    pub value: Option<Value>,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct DowngradeResult {
    pub card: Value,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct UecDiffEntry {
    pub path: String,
    pub change_type: String,
    pub before: Option<Value>,
    pub after: Option<Value>,
}

#[derive(Debug, Clone, Default)]
pub struct MergeOptions {
    pub array: Option<String>,
    pub conflict: Option<String>,
}

#[derive(Debug, Clone)]
pub struct MergeResult {
    pub value: Value,
    pub conflicts: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct AssetReference {
    pub path: String,
    pub kind: String,
    pub value: Value,
}

#[derive(Debug, Clone)]
pub struct LintResult {
    pub ok: bool,
    pub warnings: Vec<String>,
}

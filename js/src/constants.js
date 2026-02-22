export const SCHEMA_NAME = "UEC";
export const SCHEMA_VERSION = "1.0";
export const SCHEMA_VERSION_V2 = "2.0";

export const DEFAULT_SCHEMA = Object.freeze({
  name: SCHEMA_NAME,
  version: SCHEMA_VERSION,
});

export const DEFAULT_SCHEMA_V2 = Object.freeze({
  name: SCHEMA_NAME,
  version: SCHEMA_VERSION_V2,
});

export const KNOWN_VERSIONS = new Set([SCHEMA_VERSION, SCHEMA_VERSION_V2]);

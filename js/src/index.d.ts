export const SCHEMA_NAME: "UEC";
export const SCHEMA_VERSION: "1.0";
export const SCHEMA_VERSION_V2: "2.0";

export type UecKind = "character" | "persona";

export interface UecSchema {
  name: "UEC";
  version: string;
  compat?: string;
}

// ---------------------------------------------------------------------------
// Shared / v1 types
// ---------------------------------------------------------------------------

export interface UecAppSpecificSettings {
  [key: string]: unknown;
}

export interface UecMeta {
  createdAt?: number;
  updatedAt?: number;
  source?: string;
  authors?: string[];
  license?: string;
  [key: string]: unknown;
}

export interface UecMetaV2 extends UecMeta {
  originalCreatedAt?: number;
  originalUpdatedAt?: number;
  originalSource?: string;
}

export interface UecExtensions {
  [key: string]: unknown;
}

// v1: scenes are an array, each scene carries its own `id`
export interface CharacterScene {
  id: string;
  content: string;
  direction?: string;
  createdAt?: number;
  variants?: MessageVariant[];
  selectedVariantId?: string | null;
  [key: string]: unknown;
}

// v2: single scene object with selectedVariant (0 = base, or variant ID string)
export interface CharacterSceneV2 {
  id: string;
  content: string;
  direction?: string;
  createdAt?: number;
  variants?: MessageVariant[];
  selectedVariant?: 0 | string;
  [key: string]: unknown;
}

export interface MessageVariant {
  id: string;
  content: string;
  createdAt: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Voice config
// ---------------------------------------------------------------------------

export interface VoiceConfig {
  source: string;
  providerId: string;
  voiceId: string;
  [key: string]: unknown;
}

export interface VoiceConfigV2 {
  source: string;
  providerId?: string | null;
  voiceId?: string | null;
  userVoiceId?: string | null;
  modelId?: string | null;
  voiceName?: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Asset locator (v2)
// ---------------------------------------------------------------------------

export interface AssetLocatorInlineBase64 {
  type: "inline_base64";
  data: string;
  mimeType?: string;
}

export interface AssetLocatorRemoteUrl {
  type: "remote_url";
  url: string;
  mimeType?: string;
  data?: string;
}

export interface AssetLocatorAssetRef {
  type: "asset_ref";
  assetId: string;
  mimeType?: string;
}

export type AssetLocator =
  | AssetLocatorInlineBase64
  | AssetLocatorRemoteUrl
  | AssetLocatorAssetRef;

// ---------------------------------------------------------------------------
// Character book (v2)
// ---------------------------------------------------------------------------

export interface CharacterBookEntry {
  name?: string | null;
  keys?: string[];
  secondary_keys?: string[];
  content: string;
  enabled?: boolean;
  insertion_order?: number;
  case_sensitive?: boolean;
  priority?: number;
  constant?: boolean;
  [key: string]: unknown;
}

export interface CharacterBook {
  name?: string | null;
  description?: string | null;
  entries?: CharacterBookEntry[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// v1 Payloads
// ---------------------------------------------------------------------------

export interface CharacterPayload {
  id: string;
  name: string;
  description?: string;
  avatar?: string | null;
  chatBackground?: string | null;
  definitions?: string;
  tags?: string[];
  rules?: string[];
  scenes?: CharacterScene[];
  defaultSceneId?: string | null;
  defaultModelId?: string | null;
  systemPrompt?: string | null;
  voiceConfig?: VoiceConfig | null;
  voiceAutoplay?: boolean;
  createdAt?: number;
  updatedAt?: number;
  [key: string]: unknown;
}

export interface PersonaPayload {
  id: string;
  title: string;
  description?: string;
  avatar?: string | null;
  isDefault?: boolean;
  createdAt?: number;
  updatedAt?: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// v2 Payloads
// ---------------------------------------------------------------------------

export interface CharacterPayloadV2 {
  id: string;
  name: string;
  description?: string;
  avatar?: string | AssetLocator | null;
  chatBackground?: string | AssetLocator | null;
  definitions?: string;
  tags?: string[];
  scene?: CharacterSceneV2 | null;
  defaultModelId?: string | null;
  fallbackModelId?: string | null;
  systemPrompt?: string | null;
  promptTemplateId?: string | null;
  nickname?: string | null;
  creator?: string | null;
  creatorNotes?: string | null;
  creatorNotesMultilingual?: { [key: string]: unknown };
  source?: string[];
  voiceConfig?: VoiceConfigV2 | null;
  voiceAutoplay?: boolean;
  characterBook?: CharacterBook | null;
  createdAt?: number;
  updatedAt?: number;
  [key: string]: unknown;
}

export interface PersonaPayloadV2 {
  id: string;
  title: string;
  description?: string;
  avatar?: string | AssetLocator | null;
  isDefault?: boolean;
  createdAt?: number;
  updatedAt?: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// v1 Card types
// ---------------------------------------------------------------------------

export interface UecCharacter {
  schema: UecSchema;
  kind: "character";
  payload: CharacterPayload;
  app_specific_settings?: UecAppSpecificSettings;
  meta?: UecMeta;
  extensions?: UecExtensions;
}

export interface UecPersona {
  schema: UecSchema;
  kind: "persona";
  payload: PersonaPayload;
  app_specific_settings?: UecAppSpecificSettings;
  meta?: UecMeta;
  extensions?: UecExtensions;
}

export type UecUnion = UecCharacter | UecPersona;

// ---------------------------------------------------------------------------
// v2 Card types
// ---------------------------------------------------------------------------

export interface UecCharacterV2 {
  schema: UecSchema;
  kind: "character";
  payload: CharacterPayloadV2;
  app_specific_settings?: UecAppSpecificSettings;
  meta?: UecMetaV2;
  extensions?: UecExtensions;
}

export interface UecPersonaV2 {
  schema: UecSchema;
  kind: "persona";
  payload: PersonaPayloadV2;
  app_specific_settings?: UecAppSpecificSettings;
  meta?: UecMetaV2;
  extensions?: UecExtensions;
}

export type UecUnionV2 = UecCharacterV2 | UecPersonaV2;

export type UecAny = UecUnion | UecUnionV2;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export interface ValidateOptions {
  strict?: boolean;
}

export interface ParseValidationResultOk {
  ok: true;
  value: UecAny;
  errors: [];
}

export interface ParseValidationResultFail {
  ok: false;
  errors: string[];
}

export type ParseValidationResult =
  | ParseValidationResultOk
  | ParseValidationResultFail;

export interface StringifyOptions {
  space?: number;
}

export interface DowngradeOptions {
  keepRules?: boolean;
}

export interface DowngradeResult {
  card: UecUnion;
  warnings: string[];
}

export interface UecDiffEntry {
  path: string;
  type: "added" | "removed" | "changed";
  before?: unknown;
  after?: unknown;
}

export interface MergeOptions {
  array?: "replace" | "concat";
  conflict?: "incoming" | "base";
}

export interface MergeResult {
  value: unknown;
  conflicts: string[];
}

export interface AssetReference {
  path: string;
  kind: "string" | "locator";
  value: unknown;
}

export interface LintResult {
  ok: boolean;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

export function createUEC(input: {
  kind: UecKind;
  payload:
    | CharacterPayload
    | PersonaPayload
    | CharacterPayloadV2
    | PersonaPayloadV2;
  schema?: Partial<UecSchema>;
  appSpecificSettings?: UecAppSpecificSettings;
  meta?: UecMeta | UecMetaV2;
  extensions?: UecExtensions;
  systemPromptIsId?: boolean;
}): UecAny;

export function createCharacterUEC(
  payload: CharacterPayloadV2,
  options: {
    schema: Partial<UecSchema> & { version: "2.0" };
    appSpecificSettings?: UecAppSpecificSettings;
    meta?: UecMetaV2;
    extensions?: UecExtensions;
    systemPromptIsId?: boolean;
  },
): UecCharacterV2;

export function createCharacterUEC(
  payload: CharacterPayload,
  options?: {
    schema?: Partial<UecSchema>;
    appSpecificSettings?: UecAppSpecificSettings;
    meta?: UecMeta;
    extensions?: UecExtensions;
    systemPromptIsId?: boolean;
  },
): UecCharacter;

export function createPersonaUEC(
  payload: PersonaPayloadV2,
  options: {
    schema: Partial<UecSchema> & { version: "2.0" };
    appSpecificSettings?: UecAppSpecificSettings;
    meta?: UecMetaV2;
    extensions?: UecExtensions;
  },
): UecPersonaV2;

export function createPersonaUEC(
  payload: PersonaPayload,
  options?: {
    schema?: Partial<UecSchema>;
    appSpecificSettings?: UecAppSpecificSettings;
    meta?: UecMeta;
    extensions?: UecExtensions;
  },
): UecPersona;

export function createCharacterUECv2(
  payload: CharacterPayloadV2,
  options?: {
    schema?: Partial<UecSchema>;
    appSpecificSettings?: UecAppSpecificSettings;
    meta?: UecMetaV2;
    extensions?: UecExtensions;
  },
): UecCharacterV2;

export function createPersonaUECv2(
  payload: PersonaPayloadV2,
  options?: {
    schema?: Partial<UecSchema>;
    appSpecificSettings?: UecAppSpecificSettings;
    meta?: UecMetaV2;
    extensions?: UecExtensions;
  },
): UecPersonaV2;

export function convertUECv1toV2(card: UecCharacter): UecCharacterV2;
export function convertUECv1toV2(card: UecPersona): UecPersonaV2;
export function convertUECv1toV2(card: UecUnion): UecUnionV2;

export function validateUEC(
  value: unknown,
  options?: ValidateOptions,
): ValidationResult;

export function isUEC(
  value: unknown,
  options?: ValidateOptions,
): value is UecAny;

export function assertUEC(value: unknown, options?: ValidateOptions): UecAny;

export function parseUEC(
  json: string,
  options?: ValidateOptions,
): ParseValidationResult;

export function stringifyUEC(card: unknown, options?: StringifyOptions): string;

export function normalizeUEC(card: unknown): unknown;

export function upgradeUEC(card: UecAny, targetVersion?: "1.0" | "2.0"): UecAny;

export function downgradeUEC(
  card: UecAny,
  targetVersion?: "1.0",
  options?: DowngradeOptions,
): DowngradeResult;

export function diffUEC(a: unknown, b: unknown): UecDiffEntry[];

export function mergeUEC(
  base: unknown,
  incoming: unknown,
  strategy?: MergeOptions,
): MergeResult;

export function validateUECStrict(
  value: unknown,
  options?: ValidateOptions,
): ValidationResult;

export function validateUECAtVersion(
  value: unknown,
  version: "1.0" | "2.0",
  options?: ValidateOptions,
): ValidationResult;

export function isCharacterUEC(
  value: unknown,
  options?: ValidateOptions,
): value is UecCharacter | UecCharacterV2;

export function isPersonaUEC(
  value: unknown,
  options?: ValidateOptions,
): value is UecPersona | UecPersonaV2;

export function extractAssets(card: unknown): AssetReference[];

export function rewriteAssets(
  card: unknown,
  mapper: (asset: AssetReference) => unknown,
): unknown;

export function lintUEC(card: unknown): LintResult;

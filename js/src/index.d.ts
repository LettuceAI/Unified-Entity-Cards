export const SCHEMA_NAME: "UEC";
export const SCHEMA_VERSION: string;

export type UecKind = "character" | "persona";

export interface UecSchema {
  name: "UEC";
  version: string;
  compat?: string;
}

export interface UecAppSpecificSettings {
  disableAvatarGradient?: boolean;
  customGradientEnabled?: boolean;
  customGradientColors?: string[];
  customTextColor?: string;
  customTextSecondary?: string;
  memoryType?: string;
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

export interface UecExtensions {
  [key: string]: unknown;
}

export interface CharacterScene {
  id: string;
  content: string;
  direction?: string;
  createdAt?: number;
  variants?: MessageVariant[];
  selectedVariantId?: string | null;
  [key: string]: unknown;
}

export interface MessageVariant {
  id: string;
  content: string;
  createdAt: number;
  [key: string]: unknown;
}

export interface VoiceConfig {
  source: string;
  providerId: string;
  voiceId: string;
  [key: string]: unknown;
}

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

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export interface ValidateOptions {
  strict?: boolean;
}

export function createUEC(input: {
  kind: UecKind;
  payload: CharacterPayload | PersonaPayload;
  schema?: Partial<UecSchema>;
  appSpecificSettings?: UecAppSpecificSettings;
  meta?: UecMeta;
  extensions?: UecExtensions;
  systemPromptIsId?: boolean;
}): UecUnion;

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
  payload: PersonaPayload,
  options?: {
    schema?: Partial<UecSchema>;
    appSpecificSettings?: UecAppSpecificSettings;
    meta?: UecMeta;
    extensions?: UecExtensions;
  },
): UecPersona;

export function validateUEC(
  value: unknown,
  options?: ValidateOptions,
): ValidationResult;

export function isUEC(
  value: unknown,
  options?: ValidateOptions,
): value is UecUnion;

export function assertUEC(value: unknown, options?: ValidateOptions): UecUnion;

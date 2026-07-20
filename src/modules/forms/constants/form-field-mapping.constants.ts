export const FORM_MAPPING_CONTACT_PREFIX = 'contact.';
export const FORM_MAPPING_COMPANY_PREFIX = 'company.';
export const FORM_MAPPING_CUSTOM_SEGMENT = 'custom.';
export const FORM_MAPPING_DEAL_VALUE = 'deal.value';

/** Columnas reales de Contact que un mapsTo `contact.<field>` puede llenar directo. */
export const CONTACT_DIRECT_FIELDS = ['email', 'name', 'phone'] as const;

/**
 * `contact.jobTitle` no tiene columna propia en Contact (solo tiene
 * customFields jsonb) — se guarda como si fuera `contact.custom.jobTitle`,
 * sin exigir un CustomField predefinido con ese name (a diferencia del
 * namespace `.custom.<name>` genérico, que sí valida contra CustomField).
 */
export const CONTACT_JSONB_FALLBACK_FIELDS = ['jobTitle'] as const;

/** Columnas reales de Company que un mapsTo `company.<field>` puede llenar directo. */
export const COMPANY_DIRECT_FIELDS = ['name', 'website'] as const;

/** Valida la convención completa de namespace descrita en FormField.mapsTo. */
export const FORM_MAPPING_PATTERN =
  /^(contact\.(email|name|phone|jobTitle)|contact\.custom\.[a-zA-Z0-9_]+|company\.(name|website)|company\.custom\.[a-zA-Z0-9_]+|deal\.value)$/;

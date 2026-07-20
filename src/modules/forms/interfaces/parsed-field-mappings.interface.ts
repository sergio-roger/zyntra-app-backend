export interface ParsedFieldMappings {
  contactData: {
    email?: string;
    name?: string;
    phone?: string;
    dealValue?: number;
  };
  contactCustomFields: Record<string, unknown>;
  companyData: {
    name?: string;
    website?: string;
  };
  companyCustomFields: Record<string, unknown>;
}

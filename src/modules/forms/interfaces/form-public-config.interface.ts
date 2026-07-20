import { CustomFieldType } from '@crm/enums/custom-field-type.enum';
import { FormFieldValidation } from '@/modules/forms/interfaces/form-field-validation.interface';

export interface FormPublicField {
  fieldKey: string;
  label: string;
  type: CustomFieldType;
  options: string[] | null;
  required: boolean;
  placeholder: string | null;
  validation: FormFieldValidation | null;
}

export interface FormPublicConfig {
  id: string;
  name: string;
  description: string | null;
  successMessage: string | null;
  fields: FormPublicField[];
}

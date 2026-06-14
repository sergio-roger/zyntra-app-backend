import { TransformFnParams } from 'class-transformer';

/**
 * Transformer that converts empty strings to undefined.
 * Useful for optional fields in DTOs where a frontend might send '' instead of omitting the field.
 */
export const emptyToUndefined = ({ value }: TransformFnParams): unknown =>
  value === '' ? undefined : value;

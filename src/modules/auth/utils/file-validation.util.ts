import { BadRequestException } from '@nestjs/common';
import { FileValidationOptions } from '@auth/interfaces/file-validation-options.interface';
import { UploadableFile } from '@auth/interfaces/uploadable-file.interface';

export function validateFile(
  file: UploadableFile | undefined,
  options: FileValidationOptions,
): void {
  if (!file) {
    throw new BadRequestException('No se recibió ningún archivo');
  }
  if (!options.allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException(
      `Formato de archivo no permitido. Usa ${options.allowedFormatsLabel}.`,
    );
  }
  if (file.size > options.maxSizeBytes) {
    throw new BadRequestException(
      `El archivo excede el tamaño máximo permitido (${options.maxSizeLabel}).`,
    );
  }
}

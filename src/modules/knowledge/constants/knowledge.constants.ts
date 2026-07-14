export const KB_INGESTION_QUEUE = 'kb-ingestion';

// Debe ser un subconjunto de ALLOWED_MIME_TYPES en zyntra-storage — ver
// zyntra-storage/.env.example. Defensa en profundidad: este backend valida
// antes de reenviar, zyntra-storage vuelve a validar del otro lado.
export const KB_ALLOWED_MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
};

// file-type solo puede detectar formatos binarios por magic number. Estas
// extensiones son texto plano y no tienen firma binaria — se validan por
// mimetype declarado + heurística de contenido (ver detect-knowledge-mime.util.ts).
export const KB_TEXT_ONLY_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
]);

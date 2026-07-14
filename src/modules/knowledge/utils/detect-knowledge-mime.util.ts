import { fromBuffer } from 'file-type';
import {
  KB_ALLOWED_MIME_TYPES,
  KB_TEXT_ONLY_MIME_TYPES,
} from '@/modules/knowledge/constants/knowledge.constants';

const ALLOWED_MIME_VALUES = new Set(Object.values(KB_ALLOWED_MIME_TYPES));

// Heurística simple para distinguir texto de binario: un archivo de texto
// plano (txt/md/csv) no debería tener bytes nulos en los primeros KB.
function looksLikeText(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, 1024);
  return !sample.includes(0);
}

/**
 * Detecta el mimetype real del contenido del archivo. Para PDF/DOCX usa el
 * magic number vía `file-type`. txt/md/csv no tienen firma binaria, así que
 * caen a validar el mimetype declarado por el cliente + una heurística de
 * contenido (sin bytes nulos).
 *
 * Devuelve el mimetype detectado si es uno de los permitidos, o null si el
 * archivo no matchea ningún formato permitido.
 */
export async function detectKnowledgeMimeType(
  buffer: Buffer,
  declaredMimeType: string,
): Promise<string | null> {
  const detected = await fromBuffer(buffer);

  if (detected) {
    return ALLOWED_MIME_VALUES.has(detected.mime) ? detected.mime : null;
  }

  // Sin firma binaria detectada: solo aceptamos esto para los formatos que
  // sabemos que son texto plano, y solo si el contenido realmente parece texto.
  if (KB_TEXT_ONLY_MIME_TYPES.has(declaredMimeType) && looksLikeText(buffer)) {
    return declaredMimeType;
  }

  return null;
}

import { LevelWithSilent } from 'pino';
import { randomUUID } from 'crypto';
import { IncomingMessage, ServerResponse } from 'http';

/**
 * Determina el nivel de log en base al estado de la respuesta y errores.
 */
export function customLogLevel(
  _req: IncomingMessage,
  res: ServerResponse,
  err?: Error,
): LevelWithSilent {
  if (err || res.statusCode >= 500) return 'error';
  if (res.statusCode >= 400) return 'warn';
  return 'info';
}

/**
 * Genera o propaga el ID de la petición (request ID).
 */
export function genReqId(req: IncomingMessage, res: ServerResponse): string {
  const existing = req.headers['x-request-id'];
  const id = (Array.isArray(existing) ? existing[0] : existing) || randomUUID();
  res.setHeader('x-request-id', id);
  return id;
}

/**
 * Formatea el mensaje para peticiones exitosas.
 */
export function customSuccessMessage(
  req: IncomingMessage,
  res: ServerResponse,
): string {
  return `${req.method} ${req.url} -> ${res.statusCode}`;
}

/**
 * Formatea el mensaje para peticiones fallidas.
 */
export function customErrorMessage(
  req: IncomingMessage,
  res: ServerResponse,
  err: Error,
): string {
  return `${req.method} ${req.url} -> ${res.statusCode} (${err.message})`;
}

/**
 * Serializadores personalizados para peticiones y respuestas.
 */
export const serializers = {
  req: (req: IncomingMessage & { id?: string }) => ({
    id: req.id,
    method: req.method,
    url: req.url,
  }),
  res: (res: ServerResponse) => ({
    statusCode: res.statusCode,
  }),
};

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface HttpExceptionResponse {
  message?: string | string[];
}

interface ApiError {
  code: string;
  description: string;
}

const STATUS_ERROR_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'E0003',
  [HttpStatus.UNAUTHORIZED]: 'E0001',
  [HttpStatus.PAYMENT_REQUIRED]: 'E0004',
  [HttpStatus.FORBIDDEN]: 'E0005',
  [HttpStatus.NOT_FOUND]: 'E0006',
  [HttpStatus.CONFLICT]: 'E0002',
  [HttpStatus.TOO_MANY_REQUESTS]: 'E0007',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'E5000',
  [HttpStatus.BAD_GATEWAY]: 'E5001',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'E5002',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawMessage =
      exception instanceof HttpException
        ? (exception.getResponse() as HttpExceptionResponse).message ||
          exception.message
        : 'Internal server error';

    const messages = Array.isArray(rawMessage) ? rawMessage : [rawMessage];
    const errorCode = STATUS_ERROR_CODES[status] || 'E9999';

    const errors: ApiError[] = messages.map((msg) => ({
      code: errorCode,
      description: msg,
    }));

    const formattedMessage = messages.join(', ');

    response.status(status).json({
      success: false,
      message: formattedMessage,
      data: null,
      errors,
    });
  }
}

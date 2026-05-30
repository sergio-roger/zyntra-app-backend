import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@common/interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor implements NestInterceptor<
  unknown,
  ApiResponse<unknown>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(
      map((data: unknown) => {
        // Default envelope: data is the whole controller return; envelope
        // message stays generic. Domain fields named "message" inside the
        // payload (e.g. a chatbot reply) are NOT promoted to the envelope.
        let message = 'Operation successful';
        let resultData: unknown = data;

        if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
          const obj = data as Record<string, unknown>;
          const keys = Object.keys(obj);

          // Status-only response: { message: '...' } with no other fields.
          // The string is meant as the operation status, not domain data.
          if (
            keys.length === 1 &&
            keys[0] === 'message' &&
            typeof obj.message === 'string'
          ) {
            message = obj.message;
            resultData = null;
          }
        }

        return {
          success: true,
          message,
          data: resultData,
          errors: [],
        };
      }),
    );
  }
}

import { ApiResponse } from '@common/interfaces/api-response.interface';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor<
  unknown,
  ApiResponse<unknown> | StreamableFile
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<unknown> | StreamableFile> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (data instanceof StreamableFile) {
          return data;
        }

        let message = 'Operation successful';
        let resultData: unknown = data;

        if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
          const obj = data as Record<string, unknown>;
          const keys = Object.keys(obj);

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

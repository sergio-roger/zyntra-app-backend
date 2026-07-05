import {
  REDACTION_CENSOR,
  REDACTION_PATHS,
} from '@common/logging/logger.constants';
import {
  customErrorMessage,
  customLogLevel,
  customSuccessMessage,
  genReqId,
  serializers,
} from '@common/logging/logger.utils';
import { Module, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('NODE_ENV') === 'production';

        return {
          forRoutes: [{ path: '{*splat}', method: RequestMethod.ALL }],
          pinoHttp: {
            level: config.get<string>(
              'LOG_LEVEL',
              isProduction ? 'info' : 'debug',
            ),
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname',
                  },
                },
            customLogLevel,
            genReqId,
            redact: {
              paths: REDACTION_PATHS,
              censor: REDACTION_CENSOR,
            },
            customSuccessMessage,
            customErrorMessage,
            serializers,
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}

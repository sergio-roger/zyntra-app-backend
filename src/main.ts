import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import cookieSession from 'cookie-session';
import { join } from 'path';
import { AppModule } from '@/app.module';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '@common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  app.setGlobalPrefix('api');

  app.useGlobalFilters(new AllExceptionsFilter(logger));

  app.useGlobalInterceptors(new LoggerErrorInterceptor(), new TransformInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Planchat API')
    .setDescription('Plataforma de Marketing con IA Multi-Agente')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticación y sesión')
    .addTag('settings-permissions', 'Roles y permisos')
    .addTag('settings-users', 'Usuarios CRM')
    .addTag('settings-teams', 'Equipos')
    .addTag('crm', 'Contactos y actividades')
    .addTag('crm-tasks', 'Tareas CRM')
    .addTag('crm-fields', 'Campos personalizados')
    .addTag('crm-tags', 'Etiquetas')
    .addTag('crm-segments', 'Segmentos')
    .addTag('crm-deals', 'Negocios')
    .addTag('crm-pipelines', 'Pipelines y etapas')
    .addTag('lifecycle', 'Etapas del ciclo de vida')
    .addTag('Chatbot', 'Configuración del chatbot')
    .addTag('Chat', 'Chat y conversaciones')
    .addTag('AI', 'Motor de IA')
    .addTag('tasks', 'Tareas de agentes IA')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.use(
    cookieSession({
      name: process.env.COOKIE_NAME || 'planchat_session',
      keys: [process.env.SESSION_SECRET || 'dev-secret'],
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    }),
  );

  app.enableCors({
    origin: true, // TODO: Replace with specific domain in production
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`, 'Bootstrap');
  logger.log(
    `Swagger documentation: http://localhost:${port}/api/docs`,
    'Bootstrap',
  );
}

void bootstrap();

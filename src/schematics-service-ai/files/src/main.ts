import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.enableCors();

  setupSwagger(app);

  const configService = app.get(ConfigService);
  const port = configService.get('port');

  const config = new DocumentBuilder()
    .setTitle('AI service exemplar')
    .setDescription('The exemplar API description')
    .setVersion('1.0')
    .addTag('AI')
    .addTag('exemplar')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);
}
bootstrap();

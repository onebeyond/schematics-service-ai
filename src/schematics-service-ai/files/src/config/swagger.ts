import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const setupSwagger = (app: INestApplication) => {
  const configService = app.get(ConfigService);
  const serviceName = configService.get('service.name');
  const serviceVersion = configService.get('service.version');
  const serviceDescription = configService.get('service.description');

  const options = new DocumentBuilder()
    .setTitle(serviceName)
    .setVersion(serviceVersion)
    .setDescription(serviceDescription)
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('docs', app, document);
};

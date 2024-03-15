import { Module } from '@nestjs/common';
import { ContentController } from './application/rest/content.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configValues } from './config/config';
import { validate } from './config/validation';
import { LoggerModule } from 'nestjs-pino';
import { ContentService } from './domain/services/content/content.service';
import { MongoDBService } from './infrastructure/mongodb/mongodb.service';
import { ElasticSearchService } from './infrastructure/elastic-search/elastic-search.service';
import { FileSystemService } from './infrastructure/file-system/file-system.service';
import { LangChainService } from './infrastructure/lang-chain/lang-chain.service';
import { NotionService } from './infrastructure/notion/notion.service';
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configValues],
      validate,
      isGlobal: true,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          ...(configService.get('environment') !== 'production' && {
            transport: {
              target: 'pino-pretty',
              options: {
                singleLine: true,
              },
            },
          }),
          serializers: {
            req(req) {
              // Remove if headers needs to be checked
              req.headers = 'hidden';
              return req;
            },
            res(res) {
              res.headers = 'hidden';
              return res;
            },
          },
          formatters: {
            level: (label: string) => {
              return { level: label };
            },
          },
          level: configService.get('loggingLevel'),
        },
      }),
    }),
  ],
  controllers: [ContentController],
  providers: [ContentService, MongoDBService, FileSystemService, ElasticSearchService, LangChainService, NotionService],
})
export class AppModule {}

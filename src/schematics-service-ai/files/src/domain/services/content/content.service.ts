import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Document } from '@langchain/core/documents';
import { v4 as uuid } from 'uuid';

import { ContentFile } from '../../models/ContentFile';
import { MongoDBService } from '../../../infrastructure/mongodb/mongodb.service';
import { FileSystemService } from '../../../infrastructure/file-system/file-system.service';
import { ElasticSearchService } from '../../../infrastructure/elastic-search/elastic-search.service';
import { LangChainService } from '../../../infrastructure/lang-chain/lang-chain.service';
import { NotionService } from '../../../infrastructure/notion/notion.service';

@Injectable()
export class ContentService implements OnModuleInit {
  private readonly logger = new Logger(ContentService.name);
  private contentIndex: string;

  constructor(
    private readonly mongodbService: MongoDBService,
    private readonly fileSystemService: FileSystemService,
    private readonly notionService: NotionService,
    private readonly elasticSearchService: ElasticSearchService,
    private readonly langChainService: LangChainService,
    private readonly configService: ConfigService,
  ) {
    this.contentIndex = this.configService.get<string>('elasticsearch.index');
  }

  async onModuleInit() {
    this.logger.debug(`Checking or index '${this.contentIndex}' on Elastic`);
    await this.elasticSearchService.checkIndex(this.contentIndex);
  }

  async search(): Promise<ContentFile[]> {
    return this.elasticSearchService.search<ContentFile>(this.contentIndex);
  }

  async processFiles(files: Express.Multer.File[], description: string): Promise<void> {
    const contentFiles: ContentFile[] = await Promise.all(
      files.map(async (file) => {
        const filePath = await this.fileSystemService.saveFile(file);
        return {
          id: uuid(),
          description,
          fileName: file.originalname,
          filePath,
          createdAt: new Date(),
        };
      }),
    );
    await this.elasticSearchService.indexDocuments<ContentFile>(this.contentIndex, contentFiles);
    for await (const contentFile of contentFiles) {
      const documents: Document[] =
        await this.langChainService.generateDocumentsFromFile(contentFile);
      await this.langChainService.indexDocuments(documents);
    }
  }

  async deleteContentById(id: string) {
    await this.elasticSearchService.deleteDocuments(this.contentIndex, { id });
    await this.langChainService.deleteDocumentsByInternalId(id);
  }

  async processNotionPages(pageId: string): Promise<void> {
    const pageDocs: Document[] = await this.notionService.loadPagesFromId(pageId);
    // await this.elasticSearchService.indexDocuments<Document>(this.contentIndex, pageDocs);
    await this.langChainService.indexDocuments(pageDocs);
  }

  async processNoSQLData(dbName?: string, collection?: string): Promise<number> {
    const mongo: MongoDBService = await this.mongodbService.connect();
    const data: any[] = await mongo.getAll({
      dbName: dbName ?? this.configService.get('mongodb.dbName'),
      collection: collection ?? this.configService.get('mongodb.collection'),
    });
    this.logger.debug(`Documents retrieved ${data.length}`);

    const docs: Document[] = this.langChainService.generateDocumentsFromResultSet(data);
    const batchesProcessedIds: string[] = await this.langChainService.indexDocuments(docs);
    await this.mongodbService.endConnection();

    return batchesProcessedIds.length;
  }

  async usePrompt(prompt: string, template?: string) {
    return this.langChainService.usePrompt(prompt, template);
  }

  async useAgnosticPrompt(prompt: string) {
    return this.langChainService.useAgnosticPrompt(prompt);
  }
}

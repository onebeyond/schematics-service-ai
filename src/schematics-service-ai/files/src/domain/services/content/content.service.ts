import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FileSystemService } from '../../../infrastructure/file-system/file-system.service';
import { ElasticSearchService } from '../../../infrastructure/elastic-search/elastic-search.service';
import { v4 as uuid } from 'uuid';
import { ContentFile } from '../../models/ContentFile';
import { LangChainService } from '../../../infrastructure/lang-chain/lang-chain.service';

@Injectable()
export class ContentService implements OnModuleInit {
  private readonly logger = new Logger(ContentService.name);
  private readonly contentIndex = 'content';

  constructor(
    private readonly fileSystemService: FileSystemService,
    private readonly elasticSearchService: ElasticSearchService,
    private readonly langChainService: LangChainService,
  ) {}

  async onModuleInit() {
    await this.elasticSearchService.checkIndex(this.contentIndex);
  }

  async search(): Promise<ContentFile[]> {
    return this.elasticSearchService.search<ContentFile>(this.contentIndex);
  }

  async processFiles(
    files: Express.Multer.File[],
    description: string,
  ): Promise<void> {
    const contentFiles = await Promise.all(
      files.map(async (files) => {
        const filePath = await this.fileSystemService.saveFile(files);
        return {
          id: uuid(),
          description,
          fileName: files.originalname,
          filePath,
          createdAt: new Date(),
        };
      }),
    );
    await this.elasticSearchService.indexDocuments<ContentFile>(
      this.contentIndex,
      contentFiles,
    );
    for await (const contentFile of contentFiles) {
      const documents =
        await this.langChainService.generateDocumentsFromFile(contentFile);
      await this.langChainService.indexDocuments(documents);
    }
  }

  async deleteContentById(id: string) {
    await this.elasticSearchService.deleteDocuments(this.contentIndex, { id });
    await this.langChainService.deleteDocumentsByInternalId(id);
  }

  async usePrompt(prompt: string, template?: string) {
    return this.langChainService.usePrompt(prompt, template);
  }

  async useAgnosticPrompt(prompt: string) {
    return this.langChainService.useAgnosticPrompt(prompt);
  }
}

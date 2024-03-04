import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Document } from '@langchain/core/documents';
import { NotionAPILoader } from 'langchain/document_loaders/web/notionapi';

import { DocumentRepo } from "../../../domain/models/infra/document.repo";

export class NotionRepo implements DocumentRepo {
  private readonly logger = new Logger(NotionRepo.name);
  private notionPageIds: string[];
  private notionIntegrationToken: string;

  constructor(private readonly configService: ConfigService) {
    this.notionIntegrationToken = this.configService.get<string>('notion.integrationToken');
    this.notionPageIds = this.configService.get<string[]>('notion.pageIds');
  }

  async getDocuments(): Promise<Document[]> {
    const loadAndSplit = async (pageId: string) => {
      const notionAPILoader = new NotionAPILoader({
        clientOptions: {
          auth: this.notionIntegrationToken,
        },
        id: pageId,
        type: 'page',
      });
  
      const pageDocs: Document<Record<string, any>>[] = await notionAPILoader.loadAndSplit();
      return pageDocs;
    }

    const documentLoader: Promise<Document[]>[] = this.notionPageIds.flatMap(loadAndSplit);
    const documents: Document[] = await Promise.all(documentLoader);
    return documents;
  }
}
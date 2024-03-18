import { Injectable } from '@nestjs/common';
import { Document } from 'langchain/document';
import { NotionAPILoader } from 'langchain/document_loaders/web/notionapi';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotionService {
  private readonly logger = new Logger(NotionService.name);
  private notionIntegrationToken: string;
  private notionAPILoader: NotionAPILoader;

  constructor(private readonly configService: ConfigService) {
    // eslint-disable-next-line prettier/prettier
    this.notionIntegrationToken = this.configService.get<string>('notion.integrationToken');
  }

  async loadPagesFromId(pageId: string): Promise<Document<Record<string, any>>[]> {
    this.notionAPILoader = new NotionAPILoader({
      clientOptions: {
        auth: this.notionIntegrationToken,
      },
      id: pageId,
      type: 'page',
    });
    // eslint-disable-next-line prettier/prettier
    const pageDocs: Document<Record<string, any>>[] = await this.notionAPILoader.loadAndSplit();
    this.logger.debug(`Got ${pageDocs.length} Langchain documents on loading from Notion (id: ${pageId})`);

    return pageDocs;
  }
}

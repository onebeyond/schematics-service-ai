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
  private readonly transform = (data: any): Document => {
    const {
      metadata: {
        notionId,
        loc: { lines },
      },
    } = data;
    return { ...data, metadata: { ...data.metadata, sourceId: `${notionId}-${lines.from}-${lines.to}` } };
  };

  constructor(private readonly configService: ConfigService) {
    // eslint-disable-next-line prettier/prettier
    this.notionIntegrationToken = this.configService.get<string>('notion.integrationToken');
  }

  async getAllFrom(pageId: string): Promise<Document<Record<string, any>>[]> {
    this.notionAPILoader = new NotionAPILoader({
      clientOptions: {
        auth: this.notionIntegrationToken,
      },
      id: pageId,
      type: 'page',
      onDocumentLoaded: (current: number, total: number, currentTitle?: string) =>
        this.logger.debug(`Notion document loaded: ${current} of ${total}, title: ${currentTitle}`),
    });
    // eslint-disable-next-line prettier/prettier
    const pageDocs: Document<Record<string, any>>[] = await this.notionAPILoader.loadAndSplit();

    const transformFn = this.configService.get<(data: any) => Document>('notion.transform') ?? this.transform;
    const transformedDocs: Document[] = pageDocs.map(transformFn);
    this.logger.debug(`Got ${transformedDocs.length} Langchain documents on loading from Notion (id: ${pageId})`);

    return transformedDocs;
  }
}

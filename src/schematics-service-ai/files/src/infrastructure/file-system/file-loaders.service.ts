import { JSONLoader } from 'langchain/document_loaders/fs/json';
import { Document } from 'langchain/document';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { Injectable, Logger } from '@nestjs/common';
import { CSVLoader } from 'langchain/document_loaders/fs/csv';

import { CloudContentFile, ContentFile } from '../../domain/models/ContentFile';

@Injectable()
export class FileTypesLoadersService {
  private readonly logger = new Logger(FileTypesLoadersService.name);
  private readonly pickDocumentSource: (descriptor: ContentFile | CloudContentFile) => string = (
    descriptor: ContentFile | CloudContentFile,
  ) => ('containerOrBucket' in descriptor ? descriptor.blobName : descriptor.fileName);

  private async generateDocumentsFromPdf(contentFile: ContentFile): Promise<Document[]> {
    const loader = new PDFLoader(contentFile.filePath, {
      splitPages: true,
    });
    const docs = await loader.load();
    this.logger.log(`extracted ${docs.length} documents from ${contentFile.fileName}`);
    return docs.map((doc: Document, i: number) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        internal_id: contentFile.id,
        description: contentFile.description,
        source: this.pickDocumentSource(contentFile),
        sourceId: `${contentFile.fileName}-${i}`,
      },
    }));
  }

  async generateDocumentsFromCsv(contentFile: ContentFile): Promise<Document[]> {
    const loader = new CSVLoader(contentFile.filePath);
    const docs = await loader.load();
    this.logger.log(`extracted ${docs.length} documents from ${contentFile.fileName}`);
    return docs.map((doc: Document, i: number) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        internal_id: contentFile.id,
        description: contentFile.description,
        source: this.pickDocumentSource(contentFile),
        sourceId: `${contentFile.fileName}-${i}`,
      },
    }));
  }

  async generateDocumentsFromJson(contentFile: ContentFile): Promise<Document[]> {
    const loader = new JSONLoader(contentFile.filePath);
    const docs = await loader.loadAndSplit();

    this.logger.log(`extracted ${docs.length} documents from ${contentFile.fileName}`);
    return docs.map((doc: Document, i: number) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        internal_id: contentFile.id,
        description: contentFile.description,
        source: this.pickDocumentSource(contentFile),
        sourceId: `${contentFile.fileName}-${i}`,
      },
    }));
  }

  async generateDocuments(contentFile: ContentFile): Promise<Document[]> {
    let loader: (contentFile: ContentFile) => Promise<Document<Record<string, any>>[]>;

    const fileExtension = contentFile.fileName.split('.').pop();
    switch (fileExtension) {
      case 'csv':
        loader = this.generateDocumentsFromCsv.bind(this);
        break;
      case 'json':
        loader = this.generateDocumentsFromJson.bind(this);
        break;
      case 'pdf':
        loader = this.generateDocumentsFromPdf.bind(this);
        break;
      default:
        break;
    }
    if (!!loader) return loader(contentFile);

    this.logger.error(
      // eslint-disable-next-line max-len
      `Unsupported file extension: ${fileExtension} (${contentFile.fileName}): No documents where generated for indexing`,
    );
    return [];
  }
}

import { ContentFile } from '../../../domain/models/ContentFile';
import { Document } from '@langchain/core/documents';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { Logger } from '@nestjs/common';
import { CSVLoader } from 'langchain/document_loaders/fs/csv';

export class FileLoaders {
  private readonly logger = new Logger(FileLoaders.name);

  private async generateDocumentsFromPdf(contentFile: ContentFile): Promise<Document[]> {
    const loader = new PDFLoader(contentFile.filePath, {
      splitPages: true,
    });
    const docs = await loader.load();
    this.logger.log(`extracted ${docs.length} documents from ${contentFile.fileName}`);
    return docs.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        internal_id: contentFile.id,
        description: contentFile.description,
      },
    }));
  }

  async generateDocumentsFromCsv(contentFile: ContentFile): Promise<Document[]> {
    const loader = new CSVLoader(contentFile.filePath);
    const docs = await loader.load();
    this.logger.log(`extracted ${docs.length} documents from ${contentFile.fileName}`);
    return docs.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        internal_id: contentFile.id,
        description: contentFile.description,
      },
    }));
  }

  async generateDocuments(contentFile: ContentFile): Promise<Document[]> {
    const fileExtension = contentFile.fileName.split('.').pop();
    switch (fileExtension) {
      case 'pdf':
        return this.generateDocumentsFromPdf(contentFile);
      case 'csv':
        return this.generateDocumentsFromCsv(contentFile);
      default:
        throw new Error(`unsupported file extension: ${fileExtension}`);
    }
  }
}

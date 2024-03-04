import { Document } from '@langchain/core/documents';

export interface DocumentRepo {
  getDocuments(): Promise<Document[]>;
}

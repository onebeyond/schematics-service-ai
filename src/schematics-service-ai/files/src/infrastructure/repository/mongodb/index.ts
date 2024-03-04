import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, Db, Collection } from 'mongodb';
import { Document } from '@langchain/core/documents';

import { DocumentRepo } from '../../../domain/models/infra/document.repo';

@Injectable()
export class MongoDbRepo implements DocumentRepo {
  private readonly logger = new Logger(MongoDbRepo.name);
  private readonly client: MongoClient;
  private db: Db;
  private collection: Collection;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('mongodb.url');
    const dbName = this.configService.get<string>('mongodb.dbName');
    const collectionName = this.configService.get<string>('mongodb.collectionName'); // eslint-disable-line prettier/prettier
    this.client = new MongoClient(url);
    this.client.connect().then(() => {
      this.db = this.client.db(dbName);
      this.collection = this.db.collection(collectionName);
    });
  }

  async getDocuments(): Promise<Document[]> {
    const allData: any[] = await this.collection.find().toArray();
    const docs: Document[] = allData.map((row: any) => new Document({
      pageContent: JSON.stringify(row)
    }));

    return docs;
  }
}

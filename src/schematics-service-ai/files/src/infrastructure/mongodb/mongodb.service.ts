import { Injectable, Logger } from '@nestjs/common';
import { Document } from 'langchain/document';
import { ConfigService } from '@nestjs/config';
import { MongoClient, Db } from 'mongodb';

@Injectable()
export class MongoDBService {
  private readonly url: string;
  // private db: Db;
  // private collections: { [collection: string]: CollectionOps };
  private readonly logger = new Logger(MongoDBService.name);
  private client: MongoClient;
  private connected: boolean = false;
  private readonly transform = (data: Document): Document => {
    const {
      metadata: { _id },
    } = data;
    return { ...data, metadata: { ...data.metadata, sourceId: String(_id) } };
  };
  isAvailable: boolean;

  constructor(private readonly configService: ConfigService) {
    this.url = configService.get<string>('mongodb.connectionString');

    this.client = !!this.url ? new MongoClient(this.url) : undefined;
    this.isAvailable = !!this.client;
  }

  async connect(): Promise<MongoClient> {
    if (this.connected) return this.client;
    await this.client.connect();
    this.connected = true;

    return this.client;
  }

  async getAllFrom({ dbName, collection }: { dbName: string; collection: string }): Promise<Document[]> {
    const db: Db = (await this.connect()).db(dbName);

    const rs = await db.collection(collection).find().toArray();
    const docs: Document[] = rs.map(
      (doc) =>
        new Document({
          pageContent: JSON.stringify(doc),
          metadata: {
            _id: doc._id,
          },
        }),
    );
    const transformFn: (data: Document) => Document = this.configService.get('mongodb.transform') ?? this.transform;
    return docs.map(transformFn);
  }

  async endConnection(): Promise<void> {
    this.connected = false;
    return this.client.close();
  }
}

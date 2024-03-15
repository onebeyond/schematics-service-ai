import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, Db } from 'mongodb';

type CollectionOps = { [k: string]: (...args: any[]) => Promise<any | any[]> };

@Injectable()
export class MongoDBService {
  private readonly url: string;
  private db: Db;
  private collections: { [collection: string]: CollectionOps };
  private readonly logger = new Logger(MongoDBService.name);
  private readonly client: MongoClient;
  private connected: boolean = false;

  constructor(private readonly configService: ConfigService) {
    this.url = configService.get<string>('mongodb.connectionString');

    this.client = new MongoClient(this.url);
  }

  async connect(): Promise<MongoDBService> {
    if (this.connected) return;
    await this.client.connect();
    this.connected = true;

    return this;
  }

  async getAll({ dbName, collection }: { dbName: string; collection: string }): Promise<any[]> {
    await this.connect();
    const db: Db = this.client.db(dbName);

    return db.collection(collection).find().toArray();
  }

  async endConnection(): Promise<void> {
    return this.client.close();
  }
}

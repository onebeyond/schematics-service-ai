import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElasticSearchService {
  private readonly logger = new Logger(ElasticSearchService.name);
  private readonly client: Client;

  constructor(private readonly configService: ConfigService) {
    this.client = new Client({
      node: this.configService.get<string>('elasticsearch.url'),
    });
  }

  getClient(): Client {
    return this.client;
  }

  async checkIndex(indexName: string): Promise<void> {
    const exists = await this.client.indices.exists({ index: indexName });
    if (!exists) {
      this.logger.warn(`index ${indexName} does not exist. creating...`);
      await this.client.indices.create({ index: indexName });
    }
  }

  async similaritySearch(
    indexName: string, text: string, // eslint-disable-line prettier/prettier
  ): Promise<{ total?: number | object; results: any[] }> {
    const { hits } = await this.client.search({
      index: indexName,
      query: {
        match: {
          text,
        },
      },
    });

    const results = hits.hits.map((hit) => ({
      _source: hit._source,
      score: hit._score,
      _id: hit._id,
    }));
    return { total: hits.total?.valueOf(), results };
  }

  async search<T>(indexName: string): Promise<T[]> {
    const { hits } = await this.client.search({
      index: indexName,
    });
    return hits.hits.map((hit) => hit._source) as T[];
  }

  async indexDocuments<T>(indexName: string, documents: T[]): Promise<void> {
    documents.map(async (document) => {
      await this.client.index({
        index: indexName,
        document,
      });
    });
    await this.client.indices.refresh({ index: indexName });
    this.logger.log(`indexed ${documents.length} into ${indexName}`);
  }

  async deleteDocuments(indexName: string, conditions: object) {
    await this.client.deleteByQuery({
      index: indexName,
      query: {
        match: conditions,
      },
    });
  }
}

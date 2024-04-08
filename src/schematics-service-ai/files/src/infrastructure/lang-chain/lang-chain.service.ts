import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElasticVectorSearch, ElasticClientArgs } from '@langchain/community/vectorstores/elasticsearch';
import { index } from 'langchain/indexes';
import { PostgresRecordManager } from '@langchain/community/indexes/postgres';
import { PoolConfig } from 'pg';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { PromptTemplate } from '@langchain/core/prompts';

import { ElasticSearchService } from '../elastic-search/elastic-search.service';
import { RetrievalQAChain } from 'langchain/chains';

@Injectable()
export class LangChainService {
  private readonly logger = new Logger(LangChainService.name);
  private vectorStore: ElasticVectorSearch;
  private recordManager: PostgresRecordManager;
  private readonly indexingStrategy: 'full' | 'incremental' | undefined;
  private readonly openAIChat: ChatOpenAI;
  private readonly indexName: string; // should be in config
  private readonly azureOpenAIApiKey: string;
  private readonly azureOpenAIApiVersion: string;
  private readonly azureOpenAIApiInstanceName: string;
  private readonly azureOpenAIApiEmbeddingsDeploymentName: string;

  private readonly splice = <T>(l: T[], c: number): T[][] =>
    l.length < c ? [l] : [l.splice(0, c), ...this.splice<T>(l, c)];

  constructor(
    private readonly configService: ConfigService,
    private readonly elasticSearchService: ElasticSearchService,
  ) {
    this.azureOpenAIApiKey = this.configService.get<string>('azure.openai.apiKey');
    this.azureOpenAIApiVersion = this.configService.get<string>('azure.openai.apiVersion');
    this.azureOpenAIApiInstanceName = this.configService.get<string>('azure.openai.apiInstanceName');
    this.azureOpenAIApiEmbeddingsDeploymentName = this.configService.get<string>(
      'azure.openai.apiEmbeddingsDeploymentName',
    );

    this.indexName = this.configService.get<string>('elasticsearch.index');
    const clientArgs: ElasticClientArgs = {
      client: this.elasticSearchService.getClient(),
      indexName: this.indexName,
    };

    const embeddings = new OpenAIEmbeddings({
      azureOpenAIApiKey: this.azureOpenAIApiKey,
      azureOpenAIApiVersion: this.azureOpenAIApiVersion,
      azureOpenAIApiInstanceName: this.azureOpenAIApiInstanceName,
      azureOpenAIApiDeploymentName: this.azureOpenAIApiEmbeddingsDeploymentName,
    });
    this.vectorStore = new ElasticVectorSearch(embeddings, clientArgs);
    this.openAIChat = new ChatOpenAI({
      temperature: this.configService.get<number>('azure.openai.apiChatTemperature'),
      azureOpenAIApiKey: this.azureOpenAIApiKey,
      azureOpenAIApiVersion: this.azureOpenAIApiVersion,
      azureOpenAIApiInstanceName: this.azureOpenAIApiInstanceName,
      azureOpenAIApiDeploymentName: this.configService.get<string>('azure.openai.apiChatDeploymentName'),
    });
    const recordManagerConfig = {
      postgresConnectionOptions: {
        type: 'postgres',
        host: this.configService.get('recordManager.database.host'),
        port: this.configService.get<number>('recordManager.database.port'),
        user: this.configService.get('recordManager.database.user'),
        password: this.configService.get('recordManager.database.password'),
        database: this.configService.get('recordManager.database.database'),
      } as PoolConfig,
      tableName: this.configService.get('recordManager.tableName'),
    };
    this.recordManager = new PostgresRecordManager('obai-namespace', recordManagerConfig);
    this.indexingStrategy = this.configService.get('indexingStrategy');

    this.logger.debug('All langchain resources initialized');
  }

  generateDocumentsFromResultSet(data: any[]): Document[] {
    return data.map(
      (doc: any) =>
        new Document({
          pageContent: JSON.stringify(doc),
          metadata: {
            _id: doc._id,
          },
        }),
    );
  }

  async indexDocuments(docs: Document[]): Promise<[number, number]> {
    const spliceSize = docs.length / 10;
    const docSlices: Document[][] = this.splice<Document>(docs, spliceSize); // docs is mutated
    let [documentsAdded, documentsUpdated]: [number, number] = [0, 0];

    await this.recordManager.createSchema();
    for (let i = 0; i < docSlices.length; i++) {
      this.logger.debug(`Adding document slice ${i + 1} to vector store`);
      try {
        const indexResult = await index({
          docsSource: docSlices[i],
          recordManager: this.recordManager,
          vectorStore: this.vectorStore,
          options: {
            cleanup: this.indexingStrategy,
            sourceIdKey: 'sourceId',
          },
        });
        [documentsAdded, documentsUpdated] = [
          documentsAdded + indexResult.numAdded,
          documentsUpdated + indexResult.numUpdated,
        ];
        this.logger.debug(
          `Added: ${indexResult.numAdded}, Updated: ${indexResult.numUpdated}, Skipped: ${indexResult.numSkipped}`,
        );
      } catch (err) {
        this.logger.error(`Error indexing (slice ${i + 1}): ${JSON.stringify(err)}`);
        throw err;
      }
    }
    this.logger.log(`Processed: add ${documentsAdded} documents, updated ${documentsUpdated} documents`);

    return [documentsAdded, documentsUpdated];
  }

  async searchDocsBySimilarity(query: string): Promise<Document[]> {
    const results: Document[] = await this.vectorStore.similaritySearch(query, 2); // eslint-disable-line
    return results;
  }

  async deleteDocumentsByInternalId(internalId: string, indexName?: string) {
    await this.elasticSearchService.deleteDocuments(indexName ?? this.indexName, {
      'metadata.internal_id': internalId,
    });
    this.logger.log(`Deleted documents with internal id ${internalId}`);
  }

  async usePrompt(prompt: string, template?: string) {
    this.logger.debug(`question: ${prompt}`);
    const chain = RetrievalQAChain.fromLLM(this.openAIChat, this.vectorStore.asRetriever(), {
      prompt: template ? PromptTemplate.fromTemplate(template) : undefined,
    });
    return chain.invoke({
      query: prompt,
    });
  }
}

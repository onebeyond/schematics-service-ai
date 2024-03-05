import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElasticVectorSearch } from '@langchain/community/vectorstores/elasticsearch';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { RetrievalQAChain } from 'langchain/chains';
import { PromptTemplate } from '@langchain/core/prompts';

import { ElasticSearchService } from '../elastic-search/elastic-search.service';
import { ContentFile } from '../../domain/models/ContentFile';
import { FileLoaders } from './lib/file-loaders';

@Injectable()
export class LangChainService {
  private readonly logger = new Logger(LangChainService.name);
  private vectorStore: ElasticVectorSearch;
  private readonly openAIChat: ChatOpenAI;
  private readonly indexName = 'embeddings';
  private readonly azureOpenAIApiKey: string;
  private readonly azureOpenAIApiVersion: string;
  private readonly azureOpenAIApiInstanceName: string;
  private readonly azureOpenAIApiEmbeddingsDeploymentName: string;
  private fileLoaders = new FileLoaders();

  private readonly splice = (l: any[], c: number) =>
    l.length < c ? [l] : [l.splice(0, c), ...this.splice(l, c)];

  constructor(
    private readonly configService: ConfigService,
    private readonly elasticSearchService: ElasticSearchService,
  ) {
    this.azureOpenAIApiKey = this.configService.get<string>(
      'azure.openai.apiKey',
    );
    this.azureOpenAIApiVersion = this.configService.get<string>(
      'azure.openai.apiVersion',
    );
    this.azureOpenAIApiInstanceName = this.configService.get<string>(
      'azure.openai.apiInstanceName',
    );
    this.azureOpenAIApiEmbeddingsDeploymentName =
      this.configService.get<string>(
        'azure.openai.apiEmbeddingsDeploymentName',
      );
    const clientArgs = {
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
      temperature: this.configService.get<number>(
        'azure.openai.apiChatTemperature',
      ),
      azureOpenAIApiKey: this.azureOpenAIApiKey,
      azureOpenAIApiVersion: this.azureOpenAIApiVersion,
      azureOpenAIApiInstanceName: this.azureOpenAIApiInstanceName,
      azureOpenAIApiDeploymentName: this.configService.get<string>(
        'azure.openai.apiChatDeploymentName',
      ),
    });
  }

  async generateDocumentsFromFile(
    contentFile: ContentFile,
  ): Promise<Document[]> {
    return this.fileLoaders.generateDocuments(contentFile);
  }

  async indexDocuments(docs: Document[]) {
    const numberOfDocs = docs.length;
    const spliceSize = docs.length / 10;
    const docSlices = this.splice(docs, spliceSize);
    for (let i = 0; i < docSlices.length; i++) {
      this.logger.debug(`Adding document slice ${i + 1} to vector store`);
      await this.vectorStore.addDocuments(docSlices[i]);
    }
    this.logger.log(`Indexed ${numberOfDocs} documents`);

    return numberOfDocs;
  }

  async deleteDocumentsByInternalId(internalId: string) {
    await this.elasticSearchService.deleteDocuments(this.indexName, {
      'metadata.internal_id': internalId,
    });
    this.logger.log(`deleted documents with internal id ${internalId}`);
  }

  async usePrompt(prompt: string, template?: string) {
    this.logger.log(`prompting: ${prompt}`);
    const chain = RetrievalQAChain.fromLLM(
      this.openAIChat,
      this.vectorStore.asRetriever(),
      {
        prompt: template ? PromptTemplate.fromTemplate(template) : undefined,
      },
    );
    return chain.invoke({
      query: prompt,
    });
  }

  async useAgnosticPrompt(prompt: string): Promise<string> {
    const response = await this.openAIChat.invoke(prompt);
    return response.content as string;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElasticVectorSearch } from '@langchain/community/vectorstores/elasticsearch';
import { ElasticSearchService } from '../elastic-search/elastic-search.service';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { ContentFile } from '../../domain/models/ContentFile';
import { RetrievalQAChain } from 'langchain/chains';
import { PromptTemplate } from 'langchain/prompts';
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
    await this.vectorStore.addDocuments(docs);
    this.logger.log(`indexed ${docs.length} documents`);
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

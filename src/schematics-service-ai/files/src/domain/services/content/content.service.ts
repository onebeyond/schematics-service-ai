import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Document } from '@langchain/core/documents';
import { v4 as uuid } from 'uuid';

import { CloudContentFile, ContentFile } from '../../models/ContentFile';
import { MongoDBService } from '../../../infrastructure/mongodb/mongodb.service';
import { FileSystemService } from '../../../infrastructure/file-system/file-system.service';
import { ElasticSearchService } from '../../../infrastructure/elastic-search/elastic-search.service';
import { LangChainService } from '../../../infrastructure/lang-chain/lang-chain.service';
import { NotionService } from '../../../infrastructure/notion/notion.service';
import { AzureLoaderFileService, S3LoaderFileService } from '../../../infrastructure/cloud-storage';
import { AzureBlobParamsDto, S3BlobParamsDto } from '../../../application/rest/dto';
import { FileTypesLoadersService } from '../../../infrastructure/file-system/file-loaders.service';

@Injectable()
export class ContentService implements OnModuleInit {
  private readonly logger = new Logger(ContentService.name);
  private contentIndex: string;

  constructor(
    private readonly mongodbService: MongoDBService,
    private readonly fileSystemService: FileSystemService,
    private readonly notionService: NotionService,
    private readonly elasticSearchService: ElasticSearchService,
    private readonly langChainService: LangChainService,
    private readonly configService: ConfigService,
    private readonly azureLoaderService: AzureLoaderFileService,
    private readonly s3LoaderService: S3LoaderFileService,
    private readonly fileLoaders: FileTypesLoadersService,
  ) {
    this.contentIndex = this.configService.get<string>('elasticsearch.index');
  }

  async onModuleInit() {
    this.logger.debug(`Checking or index '${this.contentIndex}' on Elastic`);
    await this.elasticSearchService.checkIndex(this.contentIndex);
  }

  async search(): Promise<ContentFile[]> {
    return this.elasticSearchService.search<ContentFile>(this.contentIndex);
  }

  async similaritySearch(term: string): Promise<any> {
    const result: { total?: number | object; results: any[] } = await this.elasticSearchService.similaritySearch(
      this.contentIndex,
      term,
    );
    return result;
  }

  //#region uploadFiles
  async processFiles(files: Express.Multer.File[], description: string): Promise<void> {
    const contentFiles: ContentFile[] = await Promise.all(
      files.map(async (file) => {
        const filePath = await this.fileSystemService.saveFile(file);
        return {
          id: uuid(),
          description,
          fileName: file.originalname,
          filePath,
          createdAt: new Date(),
        } as ContentFile;
      }),
    );

    await this.elasticSearchService.indexDocuments<ContentFile>(this.contentIndex, contentFiles);
    for await (const contentFile of contentFiles) {
      // const documents: Document[] = await this.langChainService.generateDocumentsFromFile(contentFile);
      const documents: Document[] = await this.fileLoaders.generateDocuments(contentFile);
      await this.langChainService.indexDocuments(documents);
    }
  }

  //#region Azure
  async loadAzureBlobFile(blobParams: AzureBlobParamsDto): Promise<number | Error> {
    if (!this.azureLoaderService.isAvailable) return Promise.resolve(new Error('400|Service endpoint not available'));
    const { container, prefix, blobName } = blobParams;
    const containerName: string = container ?? this.configService.get<string>('storage.azure.container');
    if (!containerName) return Error(`A container must be set either by query params or config`);

    const blobNames: string[] = await this.azureLoaderService.getBlobNames(containerName, prefix, blobName);

    const buildBlobDescriptors = blobNames.map(this.azureLoaderService.buildBlobDescriptor(containerName));
    const blobDescriptors: CloudContentFile[] = await Promise.all(buildBlobDescriptors);

    const buildDocs: Promise<Document[]>[] = blobDescriptors.map((d: CloudContentFile) =>
      this.fileLoaders.generateDocuments(d),
    );
    const docs: Document[] = (await Promise.all(buildDocs)).flat();
    const [docsAdded]: [number, number] = await this.langChainService.indexDocuments(docs);

    return docsAdded;
  }

  //#region S3
  async loadS3BlobFile(blobParams: S3BlobParamsDto): Promise<number | Error> {
    if (!this.s3LoaderService.isAvailable) return Promise.resolve(new Error('400|Service endpoint not available'));
    const { bucket, prefix, blobName } = blobParams;
    const bucketName: string = bucket ?? this.configService.get<string>('storage.s3.bucket');
    if (!bucketName) return Error(`A bucket must be set either by body param 'bucket' or config`);

    const blobNames: string[] = await this.s3LoaderService.getBlobNames(bucket, prefix, blobName);

    const buildBlobDescriptors = blobNames.map(this.s3LoaderService.buildBlobDescriptor(bucket));
    const blobDescriptors: CloudContentFile[] = await Promise.all(buildBlobDescriptors);

    const buildDocs: Promise<Document[]>[] = blobDescriptors.map((d: CloudContentFile) =>
      this.fileLoaders.generateDocuments(d),
    );
    const docs: Document[] = (await Promise.all(buildDocs)).flat();
    const [docsAdded]: [number, number] = await this.langChainService.indexDocuments(docs);
    /*
    const docs: Document[] = await this.s3LoaderService.blobsToDocuments(bucket, blobNames);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [docsAdded]: [number, number] = await this.langChainService.indexDocuments(docs);
    */
    return docsAdded;
  }

  async deleteContentById(id: string) {
    await this.elasticSearchService.deleteDocuments(this.contentIndex, { id });
    await this.langChainService.deleteDocumentsByInternalId(id);
  }

  async processNotionPages(pageIds?: string): Promise<number | Error> {
    if (!this.notionService.isAvailable) return Promise.resolve(new Error('400|Service endpoint not available'));

    const notionPageIds: string = pageIds ?? this.configService.get<string[]>('notion.pageIds').join(',');
    const listPageIds: string[] = notionPageIds.split(',');
    const loadPagesTasks: Promise<Document[]>[] = listPageIds.map((pageId) => this.notionService.getAllFrom(pageId));
    const docsToIndex: Document[] = (await Promise.all(loadPagesTasks)).flat();
    // await this.elasticSearchService.indexDocuments<Document>(this.contentIndex, pageDocs);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [docsAdded] = await this.langChainService.indexDocuments(docsToIndex);
    return docsAdded;
  }

  async processNoSQLData(dbName?: string, collections?: string): Promise<number | Error> {
    if (!this.mongodbService.isAvailable) return Promise.resolve(new Error('400|Service endpoint not available'));

    const db: string = dbName ?? this.configService.get('mongodb.dbName');
    const paramCollections: string = collections ?? this.configService.get('mongodb.collections');
    const collectionsList: string[] = paramCollections.split(',');
    let documentsIndexed = 0;

    for await (const collection of collectionsList) {
      const documents: Document[] = await this.mongodbService.getAllFrom({
        dbName: db,
        collection,
      });
      this.logger.debug(`Documents retrieved ${documents.length}`);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [processedDocs] = await this.langChainService.indexDocuments(documents);
      documentsIndexed += processedDocs;
    }
    await this.mongodbService.endConnection();

    return documentsIndexed;
  }

  async usePrompt(prompt: string, template?: string) {
    return this.langChainService.usePrompt(prompt, template ?? this.configService.get('promptTemplate'));
  }
}

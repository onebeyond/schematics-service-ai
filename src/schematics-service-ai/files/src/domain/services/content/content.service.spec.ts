import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Document } from 'langchain/document';
import { ContentService } from './content.service';
import { FileSystemService } from '../../../infrastructure/file-system/file-system.service';
import { ElasticSearchService } from '../../../infrastructure/elastic-search/elastic-search.service';
import { LangChainService } from '../../../infrastructure/lang-chain/lang-chain.service';
import { NotionService } from '../../../infrastructure/notion/notion.service';
import { MongoDBService } from '../../../infrastructure/mongodb/mongodb.service';
import { AzureLoaderFileService, S3LoaderFileService } from '../../../infrastructure/cloud-storage';
import { FileTypesLoadersService } from '../../../infrastructure/file-system/file-loaders.service';

describe('ContentService', () => {
  let service: ContentService;

  const fileSystemServiceMock = {};
  const elasticSearchServiceMock = {};
  const azureLoaderFileServiceMock = {
    getBlobNames: jest
      .fn()
      .mockImplementation((container: string, prefix: string, blobName: string) =>
        Promise.resolve([`${container}/${prefix}/0/${blobName}`, `${container}/${prefix}/1/${blobName}`]),
      ),
  };
  const s3LoaderFileServiceMock = {
    getBlobNames: jest
      .fn()
      .mockImplementation((bucket: string, prefix: string, blobName: string) =>
        Promise.resolve([`${bucket}/${prefix}/0/${blobName}`, `${bucket}/${prefix}/1/${blobName}`]),
      ),
  };
  const langChainServiceMock = {
    generateDocumentsFromResultSet: jest
      .fn()
      .mockImplementation((data: any[]) => data.map((e) => new Document({ pageContent: e }))),
    indexDocuments: jest.fn().mockImplementation((docs: Document[]) => Promise.resolve([docs.length, 0])),
  };
  const configServiceMock = {
    get: jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case 'elasticsearch.index':
          return 'index';
        case 'mongodb.connectionString':
          return 'mongoConnectionString';
        case 'mongodb.dbName':
          return 'dbName';
        case 'mongodb.collections':
          return 'collection';
        case 'notion.integrationToken':
          return 'notionToken';
        case 'notion.pageIds':
          return ['notionPageIdFromConfig', 'notionPageIdFromConfig2'];
        default:
          return undefined;
      }
    }),
  };
  const notionServiceMock = {
    isAvailable: true,
    getAllFrom: jest.fn().mockImplementation((pageId?: string) =>
      Promise.resolve({
        pageContent: `Content for ${pageId}`,
        metadata: { notionId: pageId, loc: { lines: { from: 8, to: 12 } }, sourceId: `${pageId}-8-12` },
      }),
    ),
  };
  const mongodbServiceMock = {
    connect: () => mongodbServiceMock,
    isAvailable: true,
    getAllFrom: jest.fn().mockImplementation(({ dbName, collection }) =>
      Promise.resolve([
        {
          pageContent: `Content for ${dbName} & ${collection}`,
          metadata: { _id: '64b53d0a06fffcd1770e5499', sourceId: '64b53d0a06fffcd1770e5499' },
        },
      ]),
    ),
    endConnection: () => Promise.resolve(),
  };
  const filetypesLoadersServiceMock = {
    generateDocuments: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: FileSystemService,
          useValue: fileSystemServiceMock,
        },
        {
          provide: MongoDBService,
          useValue: mongodbServiceMock,
        },
        {
          provide: NotionService,
          useValue: notionServiceMock,
        },
        {
          provide: ElasticSearchService,
          useValue: elasticSearchServiceMock,
        },
        {
          provide: LangChainService,
          useValue: langChainServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: AzureLoaderFileService,
          useValue: azureLoaderFileServiceMock,
        },
        {
          provide: S3LoaderFileService,
          useValue: s3LoaderFileServiceMock,
        },
        {
          provide: FileTypesLoadersService,
          useValue: filetypesLoadersServiceMock,
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Optional parameters on embedding methods', () => {
    describe('on mongodb', () => {
      it('should call mongo service with right parameters picked from config', async () => {
        let result: number | Error;
        let error: unknown;
        const [dbName, collection] = [undefined, undefined];

        try {
          result = await service.processNoSQLData(dbName, collection);
        } catch (err: unknown) {
          error = err;
        } finally {
          expect(error).toBeUndefined();
          expect(result).toBe(1);
          expect(configServiceMock.get).toHaveBeenNthCalledWith(2, 'mongodb.dbName');
          expect(configServiceMock.get).toHaveBeenNthCalledWith(3, 'mongodb.collections');
          expect(mongodbServiceMock.getAllFrom).toHaveBeenCalledWith({ dbName: 'dbName', collection: 'collection' });
        }
      });

      it('should call mongo service with parameters from controller', async () => {
        const [dbName, collections] = ['dbName', 'coll'];
        let result: number | Error;
        let error: unknown;

        try {
          result = await service.processNoSQLData(dbName, collections);
        } catch (err: unknown) {
          error = err;
        } finally {
          expect(error).toBeUndefined();
          expect(result).toBe(1);
          expect(configServiceMock.get).toHaveBeenCalledTimes(1);
          expect(mongodbServiceMock.getAllFrom).toHaveBeenCalledWith({ dbName, collection: collections });
        }
      });

      it('should call mongo service if only one parameter is collection', async () => {
        const [dbName, collection] = [undefined, 'coll'];
        let result: number | Error;
        let error: unknown;

        try {
          result = await service.processNoSQLData(dbName, collection);
        } catch (err: unknown) {
          error = err;
        } finally {
          expect(error).toBeUndefined();
          expect(result).toBe(1);
          expect(configServiceMock.get).toHaveBeenNthCalledWith(2, 'mongodb.dbName');
        }
      });

      it('should call mongo service with multiple collections to index', async () => {
        const [dbName, collections] = ['dbName', 'coll1,coll2,coll3'];
        let result: number | Error;
        let error: unknown;

        try {
          result = await service.processNoSQLData(dbName, collections);
        } catch (err: unknown) {
          error = err;
        } finally {
          expect(error).toBeUndefined();
          expect(result).toBe(3);
          expect(configServiceMock.get).toHaveBeenCalledTimes(1);
          expect(mongodbServiceMock.getAllFrom).toHaveBeenNthCalledWith(1, { dbName, collection: 'coll1' });
          expect(mongodbServiceMock.getAllFrom).toHaveBeenNthCalledWith(2, { dbName, collection: 'coll2' });
          expect(mongodbServiceMock.getAllFrom).toHaveBeenNthCalledWith(3, { dbName, collection: 'coll3' });
          expect(langChainServiceMock.indexDocuments).toHaveBeenCalledTimes(3);
        }
      });
    });

    describe('on notion', () => {
      it('should call notion service with pageId from controller', async () => {
        const pageId = 'pageId';
        let error: unknown;

        try {
          await service.processNotionPages(pageId);
        } catch (err: unknown) {
          error = err;
        } finally {
          expect(error).toBeUndefined();
          expect(notionServiceMock.getAllFrom).toHaveBeenCalledWith(pageId);
        }
      });

      it('should call notion service with multiple pageIds from controller', async () => {
        const pageIds = 'pageId1,pageId2';
        let error: unknown;

        try {
          await service.processNotionPages(pageIds);
        } catch (err: unknown) {
          error = err;
        } finally {
          expect(error).toBeUndefined();
          expect(notionServiceMock.getAllFrom).toHaveBeenNthCalledWith(1, 'pageId1');
          expect(notionServiceMock.getAllFrom).toHaveBeenNthCalledWith(2, 'pageId2');
        }
      });

      it('should call notion service with pageId from config', async () => {
        let error: unknown;

        try {
          await service.processNotionPages();
        } catch (err: unknown) {
          error = err;
        } finally {
          expect(error).toBeUndefined();
          expect(notionServiceMock.getAllFrom).toHaveBeenNthCalledWith(1, 'notionPageIdFromConfig');
          expect(notionServiceMock.getAllFrom).toHaveBeenNthCalledWith(2, 'notionPageIdFromConfig2');
        }
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Document } from 'langchain/document';
import { ContentService } from './content.service';
import { FileSystemService } from '../../../infrastructure/file-system/file-system.service';
import { ElasticSearchService } from '../../../infrastructure/elastic-search/elastic-search.service';
import { LangChainService } from '../../../infrastructure/lang-chain/lang-chain.service';
import { NotionService } from '../../../infrastructure/notion/notion.service';
import { MongoDBService } from '../../../infrastructure/mongodb/mongodb.service';

describe('ContentService', () => {
  let service: ContentService;

  const fileSystemServiceMock = {};
  const elasticSearchServiceMock = {};
  const langChainServiceMock = {
    generateDocumentsFromResultSet: jest
      .fn()
      .mockImplementation((data: any[]) => data.map((e) => new Document({ pageContent: e }))),
    indexDocuments: jest.fn().mockImplementation((docs: Document[]) => Promise.resolve(docs)),
  };
  const configServiceMock = {
    get: jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case 'elasticsearch.index':
          return 'index';
        case 'mongodb.dbName':
          return 'dbName';
        case 'mongodb.collection':
          return 'collection';
        case 'notion.pageId':
          return 'notionPageIdFromConfig';
        default:
          return undefined;
      }
    }),
  };
  const notionServiceMock = {
    loadPagesFromId: jest.fn().mockImplementation((pageId?: string) => Promise.resolve({ pageId })),
  };
  const mongodbServiceMock = {
    connect: () => mongodbServiceMock,
    getAll: jest.fn().mockImplementation(({ dbName, collection }) => Promise.resolve(['elem'])), // eslint-disable-line
    endConnection: () => Promise.resolve(),
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
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Optional parameters on embedding methods', () => {
    it('should call mongo service with right parameters picked from config', async () => {
      let result: number;
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
        expect(configServiceMock.get).toHaveBeenNthCalledWith(3, 'mongodb.collection');
      }
    });

    it('should call mongo service with parameters from controller', async () => {
      const [dbName, collection] = ['dbName', 'coll'];
      let result: number;
      let error: unknown;

      try {
        result = await service.processNoSQLData(dbName, collection);
      } catch (err: unknown) {
        error = err;
      } finally {
        expect(error).toBeUndefined();
        expect(result).toBe(1);
        expect(configServiceMock.get).toHaveBeenCalledTimes(1);
      }
    });

    it('should call mongo service if only one parameter is collection', async () => {
      const [dbName, collection] = [undefined, 'coll'];
      let result: number;
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

    it('should call notion service with pageId from controller', async () => {
      const pageId = 'pageId';
      let error: unknown;

      try {
        await service.processNotionPages(pageId);
      } catch (err: unknown) {
        error = err;
      } finally {
        expect(error).toBeUndefined();
        expect(notionServiceMock.loadPagesFromId).toHaveBeenCalledWith(pageId);
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
        expect(notionServiceMock.loadPagesFromId).toHaveBeenCalledWith('notionPageIdFromConfig');
      }
    });
  });
});

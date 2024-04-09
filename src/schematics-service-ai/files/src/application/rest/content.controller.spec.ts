import { Test, TestingModule } from '@nestjs/testing';
import { ContentController } from './content.controller';
import { ContentService } from '../../domain/services/content/content.service';
import { Response } from 'express';

describe('ContentController', () => {
  let controller: ContentController;
  let contentService: ContentService;

  const responseMock: Partial<Response> = {
    status: jest.fn().mockReturnValue({
      send: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        {
          provide: ContentService,
          useValue: {
            processNotionPages: jest.fn(),
            processNoSQLData: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ContentController>(ContentController);
    contentService = module.get<ContentService>(ContentService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Notion embeddings endpoints', () => {
    it('should call processNotionPages method with the correct pageId', async () => {
      const notionParams = { pageIds: 'examplePageId,examplePageId2' };

      await controller.loadAndStoreNotionDocs(notionParams, responseMock as Response);

      expect(contentService.processNotionPages).toHaveBeenCalledWith(notionParams.pageIds);
    });

    it('should call processNotionPages method with undefined pageId', async () => {
      await controller.loadAndStoreNotionDocs({}, responseMock as Response);

      expect(contentService.processNotionPages).toHaveBeenCalledWith(undefined);
    });
  });

  describe('MongoDB embeddings endpoints', () => {
    it('should call loadAndProcessNoSQLData method with the correct params', async () => {
      const params = { dbName: 'exampleDb', collections: 'exampleCollection' };

      await controller.loadAndProcessMongoDBData(params, responseMock as Response);

      expect(contentService.processNoSQLData).toHaveBeenCalledWith(params.dbName, params.collections);
    });

    it('should be able to call the endpoint without parameters', async () => {
      await controller.loadAndProcessMongoDBData({}, responseMock as Response);

      expect(contentService.processNoSQLData).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should be able to call endpoint with only dbName', async () => {
      const dbName = 'exampleDb';

      await controller.loadAndProcessMongoDBData({ dbName }, responseMock as Response);

      expect(contentService.processNoSQLData).toHaveBeenCalledWith(dbName, undefined);
    });
  });
});

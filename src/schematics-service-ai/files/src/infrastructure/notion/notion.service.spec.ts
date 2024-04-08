import { Test, TestingModule } from '@nestjs/testing';
import { Document } from 'langchain/document';
import { NotionService } from './notion.service';
import { ConfigService } from '@nestjs/config';

const mockDocs = [
  new Document({
    pageContent: 'Document 1',
    metadata: { notionId: 'pageId1', loc: { lines: { from: 1, to: 12 } } },
  }),
  new Document({
    pageContent: 'Document 2',
    metadata: { notionId: 'pageId2', loc: { lines: { from: 12, to: 20 } } },
  }),
];

const mockLoadAndSplit = jest.fn().mockResolvedValue(mockDocs);
jest.mock('langchain/document_loaders/web/notionapi', () => {
  return {
    NotionAPILoader: jest.fn().mockImplementation(() => {
      return {
        loadAndSplit: mockLoadAndSplit,
      };
    }),
  };
});

describe('NotionService', () => {
  let service: NotionService;

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'notion.transform') return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotionService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<NotionService>(NotionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should retrieve all documents from the specified Notion page', async () => {
    // Arrange
    const pageId = 'testPageId';
    const transformedDocs = mockDocs.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        sourceId: `${doc.metadata.notionId}-${doc.metadata.loc.lines.from}-${doc.metadata.loc.lines.to}`,
      },
    }));

    // Act
    const result = await service.getAllFrom(pageId);

    expect(result).toEqual(transformedDocs);
    expect(mockLoadAndSplit).toHaveBeenCalled();
  });
});

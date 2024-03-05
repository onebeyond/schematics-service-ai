import { Test, TestingModule } from '@nestjs/testing';
import { ContentService } from './content.service';
import { FileSystemService } from '../../../infrastructure/file-system/file-system.service';
import { ElasticSearchService } from '../../../infrastructure/elastic-search/elastic-search.service';
import { LangChainService } from '../../../infrastructure/lang-chain/lang-chain.service';
import { MongoDbRepo } from '../../../infrastructure/repository/mongodb';
import { NotionRepo } from '../../../infrastructure/repository/notion';
describe('ContentService', () => {
  let service: ContentService;

  const fileSystemServiceMock = {};
  const elasticSearchServiceMock = {};
  const langChainServiceMock = {};
  const mongoDbRepoMock = {};
  const notionRepoMock = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: FileSystemService,
          useValue: fileSystemServiceMock,
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
          provide: MongoDbRepo,
          useValue: mongoDbRepoMock,
        },
        {
          provide: NotionRepo,
          useValue: notionRepoMock,
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

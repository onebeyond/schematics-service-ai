import { Test, TestingModule } from '@nestjs/testing';
import { LangChainService } from './lang-chain.service';
import { ElasticSearchService } from '../elastic-search/elastic-search.service';
import { ConfigService } from '@nestjs/config';

describe('LangChainService', () => {
  let service: LangChainService;

  const configServiceMock = {
    get: jest.fn(() => 'any'),
  };

  const elasticSearchServiceMock = {
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LangChainService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: ElasticSearchService,
          useValue: elasticSearchServiceMock,
        },
      ],
    }).compile();

    service = module.get<LangChainService>(LangChainService);
  });

  it.skip('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ElasticSearchService } from './elastic-search.service';
import { ConfigService } from '@nestjs/config';

describe('ElasticSearchService', () => {
  let service: ElasticSearchService;

  const configServiceMock = {
    get: jest.fn(() => 'http://any:9200'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticSearchService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<ElasticSearchService>(ElasticSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

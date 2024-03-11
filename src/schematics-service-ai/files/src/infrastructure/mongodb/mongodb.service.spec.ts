import { Test, TestingModule } from '@nestjs/testing';
import { MongoDBService } from './mongodb.service';
import { ConfigService } from '@nestjs/config';

describe('MongoDBService', () => {
  let service: MongoDBService;

  const configServiceMock = {
    get: jest.fn(() => 'mongodb://localhost:27017/admin'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoDBService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<MongoDBService>(MongoDBService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

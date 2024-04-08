import { Test, TestingModule } from '@nestjs/testing';
import { Document } from 'langchain/document';
import { MongoClient } from 'mongodb';
import { MongoDBService } from './mongodb.service';
import { ConfigService } from '@nestjs/config';

describe('MongoDBService', () => {
  let service: MongoDBService;

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'mongodb.connectionString') return 'mongodb://localhost:27017/admin';
    }),
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

  it('should retrieve all documents from the specified collection', async () => {
    // Arrange
    const dbName = 'testDb';
    const collection = 'testCollection';
    const documents = [
      { _id: 'a1', name: 'Document 1' },
      { _id: 'a2', name: 'Document 2' },
      { _id: 'a3', name: 'Document 3' },
    ];

    // Mock the MongoDB client and collection
    const dbMock = {
      collection: jest.fn().mockReturnThis(),
      find: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue(documents),
    };
    const clientMock = {
      db: jest.fn().mockReturnValue(dbMock),
    };
    jest.spyOn(service, 'connect').mockResolvedValue(clientMock as unknown as MongoClient);

    // Act
    const result = await service.getAllFrom({ dbName, collection });

    // Assert
    expect(service.connect).toHaveBeenCalled();
    expect(clientMock.db).toHaveBeenCalledWith(dbName);
    expect(dbMock.collection).toHaveBeenCalledWith(collection);
    expect(dbMock.find).toHaveBeenCalled();
    expect(dbMock.toArray).toHaveBeenCalled();
    expect(result).toEqual([
      // eslint-disable-next-line max-len
      new Document({
        pageContent: JSON.stringify(documents[0]),
        metadata: { _id: documents[0]._id, sourceId: documents[0]._id },
      }),
      new Document({
        pageContent: JSON.stringify(documents[1]),
        metadata: { _id: documents[1]._id, sourceId: documents[1]._id },
      }),
      new Document({
        pageContent: JSON.stringify(documents[2]),
        metadata: { _id: documents[2]._id, sourceId: documents[2]._id },
      }),
    ]);
  });
});

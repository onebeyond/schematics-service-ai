import { Test, TestingModule } from '@nestjs/testing';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';
import { AzureLoaderFileService } from './azure';

jest.mock('@azure/storage-blob');

describe('AzureLoaderFileService', () => {
  let service: AzureLoaderFileService;

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'storage.azure.connString') return 'AzureStorageConnString';
    }),
  };

  const containerClientMock = {
    listBlobsFlat: jest.fn(),
  } as unknown as ContainerClient;

  const blobServiceClientMock = {
    getContainerClient: jest.fn().mockReturnValue(containerClientMock),
  } as unknown as BlobServiceClient;
  const fromConnStringMock = jest.fn().mockReturnValue(blobServiceClientMock);

  beforeEach(async () => {
    BlobServiceClient.fromConnectionString = fromConnStringMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzureLoaderFileService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<AzureLoaderFileService>(AzureLoaderFileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return right name for a single blob', async () => {
    const container = 'myContainer';
    const prefix = undefined;
    const blobname = 'myBlobName.json';

    const listBlobs: string[] = await service.getBlobNames(container, prefix, blobname);
    expect(containerClientMock.listBlobsFlat).not.toHaveBeenCalled();
    expect(listBlobs).toEqual(['myBlobName.json']);
  });

  it('should return the valid blobname for a prefix and blobname params', async () => {
    const container = 'myContainer';
    const prefix = 'prefix/to/blob';
    const blobname = 'myBlobName.json';

    const listBlobs: string[] = await service.getBlobNames(container, prefix, blobname);
    expect(containerClientMock.listBlobsFlat).not.toHaveBeenCalled();
    expect(listBlobs).toEqual(['prefix/to/blob/myBlobName.json']);
  });

  it('should return the right list of blob names based on prefix', async () => {
    const container = 'myContainer';
    const prefix = 'prefix/to/blob';
    const blobname = undefined;

    const blobNamesListFixture = [{ name: 'prefix/to/blob/one.json' }, { name: 'prefix/to/blob/two.json' }];
    containerClientMock.listBlobsFlat = jest.fn().mockReturnValue(blobNamesListFixture);

    const listBlobs: string[] = await service.getBlobNames(container, prefix, blobname);
    expect(containerClientMock.listBlobsFlat).toHaveBeenCalledWith({ prefix });
    expect(listBlobs).toEqual(blobNamesListFixture.map((b) => b.name));
  });

  it('should return the valid list of blob names for a container', async () => {
    const container = 'myContainer';
    const prefix = undefined;
    const blobname = undefined;

    const blobNamesListFixture = [{ name: 'prefix/to/blob/one.json' }, { name: 'prefix/to/blob/two.json' }];
    containerClientMock.listBlobsFlat = jest.fn().mockReturnValue(blobNamesListFixture);

    const listBlobs: string[] = await service.getBlobNames(container, prefix, blobname);
    expect(containerClientMock.listBlobsFlat).toHaveBeenCalledWith({ prefix });
    expect(listBlobs).toEqual(blobNamesListFixture.map((b) => b.name));
  });
});

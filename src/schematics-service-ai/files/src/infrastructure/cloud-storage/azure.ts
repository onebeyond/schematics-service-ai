/* eslint-disable */
import { Injectable } from '@nestjs/common';
import { Document } from 'langchain/document';
// import { AzureBlobStorageFileLoader } from 'langchain/document_loaders/web/azure_blob_storage_file';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobDownloadResponseParsed, BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import * as fs from 'fs';
import { v4 as uuid } from 'uuid';

import { streamCopy, json2Documents, transformDoc } from './lib';
import { CloudContentFile } from 'src/domain/models/ContentFile';

@Injectable()
export class AzureLoaderFileService {
  private readonly logger = new Logger(AzureLoaderFileService.name);
  private blobServiceClient: BlobServiceClient;
  isAvailable: boolean;

  constructor(private readonly configService: ConfigService) {
    const azureStorageConnString = this.configService.get<string>('storage.azure.connString');
    this.blobServiceClient = azureStorageConnString
      ? BlobServiceClient.fromConnectionString(azureStorageConnString)
      : undefined;
    this.isAvailable = !!this.blobServiceClient;
  }

  private blobToDocuments =
    (containerClient: ContainerClient) =>
    async (fullBlobName: string): Promise<Document<Record<string, any>>[]> => {
      const blobClient = containerClient.getBlobClient(fullBlobName);

      const downloadResponse: BlobDownloadResponseParsed = await blobClient.download();

      const tmpFilePath = await streamCopy(this.logger, downloadResponse.readableStreamBody);
      const docs: Document[] = await json2Documents(this.logger, tmpFilePath);
      const transformFn = transformDoc(fullBlobName);
      const augmentedDocs: Document[] = docs.map(transformFn);

      await new Promise((resolve, reject) => fs.unlink(tmpFilePath, (err) => (err ? reject(err) : resolve(void 0))));

      // eslint-disable-next-line prettier/prettier
      this.logger.debug(`Got ${docs.length} Langchain documents on loading from Azure ${fullBlobName}`);

      return augmentedDocs;
    };

  async getBlobNames(container: string, prefix: string, blobName: string): Promise<string[]> {
    const containerClient = this.blobServiceClient.getContainerClient(container);

    const blobs: string[] = [];
    const blobList = blobName && blobName.length > 0
      ? prefix && prefix.length > 0
        ? [{ name: `${prefix}/${blobName}`.replace(/\/\//g, '/') }]
        : [{ name: blobName }]
      : containerClient.listBlobsFlat({ prefix });

    for await (const blob of blobList) {
      blobs.push(blob.name);
    }
    return blobs;
  }

  buildBlobDescriptor = (container: string) => async(blobName: string): Promise<CloudContentFile> => {
    const containerClient = this.blobServiceClient.getContainerClient(container);
    const blobClient = containerClient.getBlobClient(blobName);
    const downloadResponse: BlobDownloadResponseParsed = await blobClient.download();

    const tmpFilePath = await streamCopy(this.logger, downloadResponse.readableStreamBody);
    return {
      id: uuid(),
      filePath: tmpFilePath,
      fileName: blobName,
      blobName,
      containerOrBucket: container,
      createdAt: new Date(),
    } as CloudContentFile;
  }

  async _blobsToDocuments(container: string, blobNames: string[]): Promise<Document<Record<string, any>>[]> {
    const containerClient = this.blobServiceClient.getContainerClient(container);

    const yieldDocuments = this.blobToDocuments(containerClient);
    const blobsProcessing: Promise<Document[]>[] = blobNames.map(yieldDocuments);
    const allDocs: Document[] = (await Promise.all(blobsProcessing)).flat();

    return allDocs;

  }

  async _getAll(container: string, prefix: string, blobName: string): Promise<Document<Record<string, any>>[]> {
    const containerClient = this.blobServiceClient.getContainerClient(container);

    const yieldDocuments = this.blobToDocuments(containerClient);
    // if (blobName && blobName.length > 0) return yieldDocuments(`${prefix ?? ''}${blobName}`);

    const blobs: string[] = [];
    const blobList = blobName && blobName.length > 0
      ? prefix && prefix.length > 0
        ? [{ name: `${prefix}${blobName}`}]
        : [{ name: blobName }]
      : containerClient.listBlobsFlat({ prefix: prefix ?? '' });

    for await (const blob of blobList) {
      blobs.push(blob.name);
    }
    const blobsProcessing: Promise<Document[]>[] = blobs.map(yieldDocuments);
    const allDocs: Document[] = (await Promise.all(blobsProcessing)).flat();

    return allDocs;
  }
}

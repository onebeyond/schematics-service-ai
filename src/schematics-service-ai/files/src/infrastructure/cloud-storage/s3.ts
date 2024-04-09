/* eslint-disable */
import { Injectable } from '@nestjs/common';
import { Document } from 'langchain/document';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand, ListObjectsCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import { v4 as uuid } from 'uuid';

import { streamCopy, json2Documents, transformDoc } from './lib';
import { CloudContentFile } from '../../domain/models/ContentFile';

@Injectable()
export class S3LoaderFileService {
  private readonly logger = new Logger(S3LoaderFileService.name);
  private s3Region: string;
  private s3AccessKey: string;
  private s3SecretKey: string;
  private s3Client: S3Client;
  isAvailable: boolean;

  constructor(private readonly configService: ConfigService) {
    this.s3Region = this.configService.get<string>('storage.s3.region');
    this.s3AccessKey = this.configService.get<string>('storage.s3.credentials.accessKey');
    this.s3SecretKey = this.configService.get<string>('storage.s3.credentials.secretKey');
    this.s3Client = (!!this.s3Region && !!this.s3AccessKey && !!this.s3SecretKey)
      ? new S3Client({
          region: this.s3Region,
          credentials: {
            accessKeyId: this.s3AccessKey,
            secretAccessKey: this.s3SecretKey,
          },
        })
      : undefined;
    this.isAvailable = !!this.s3Client;
  }

  private getDocumentsFromBlob =
    (bucket: string) =>
    async (fullBlobName: string): Promise<Document<Record<string, any>>[]> => {
      const params = {
        Bucket: bucket,
        Key: fullBlobName,
      };
      const { Body } = await this.s3Client.send(new GetObjectCommand(params));

      const tmpFilePath = await streamCopy(this.logger, Body);
      const docs: Document[] = await json2Documents(this.logger, tmpFilePath);
      const transformFn = transformDoc(fullBlobName);
      const augmentedDocs: Document[] = docs.map(transformFn);

      fs.unlinkSync(tmpFilePath);
      this.logger.debug(`Got ${docs.length} Langchain documents on loading from S3 ${bucket}/${fullBlobName}`);

      return augmentedDocs;
    };

  async getBlobNames(bucket: string, prefix: string, blobName: string): Promise<string[]> {
    const { Contents } =
      blobName && blobName.length > 0
        ? prefix && prefix.length > 0
          ? { Contents: [{ Key: `${prefix}${blobName}` }] }
          : { Contents: [{ Key: blobName }] }
        : await this.s3Client.send(new ListObjectsCommand({ Bucket: bucket, Prefix: prefix }));

    const objectKeys: string[] = Contents.map((content) => content.Key);
    return objectKeys;
  }

  // eslint-disable-next-line
  buildBlobDescriptor = (bucket: string) => async (blobName: string): Promise<CloudContentFile> => {
    const params = {
      Bucket: bucket,
      Key: blobName,
    };
    const { Body } = await this.s3Client.send(new GetObjectCommand(params));

    const tmpFilePath = await streamCopy(this.logger, Body);
    return {
      id: uuid(),
      filePath: tmpFilePath,
      fileName: blobName,
      blobName,
      containerOrBucket: bucket,
      createdAt: new Date(),
    } as CloudContentFile;
  };

  async _blobsToDocuments(bucket: string, blobNames: string[]): Promise<Document<Record<string, any>>[]> {
    const processBlob = this.getDocumentsFromBlob(bucket);
    const blobsProcessing: Promise<Document[]>[] = blobNames.map(processBlob);
    const allDocs: Document[] = (await Promise.all(blobsProcessing)).flat();

    return allDocs;
  }

  async _getAll(bucket: string, prefix: string, blobName: string): Promise<Document<Record<string, any>>[]> {
    const s3 = new S3Client({
      region: this.s3Region,
      credentials: {
        accessKeyId: this.s3AccessKey,
        secretAccessKey: this.s3SecretKey,
      },
    });

    const processBlob = this.getDocumentsFromBlob(bucket);
    if (blobName && blobName.length > 0) return processBlob(`${prefix ?? ''}${blobName}`);

    const { Contents } = await s3.send(new ListObjectsCommand({ Bucket: bucket, Prefix: prefix }));
    const objectKeys = Contents.map((content) => content.Key);
    const blobsProcessing: Promise<Document[]>[] = objectKeys.map(processBlob);
    const allDocs: Document[] = (await Promise.all(blobsProcessing)).flat();

    return allDocs;
  }
}

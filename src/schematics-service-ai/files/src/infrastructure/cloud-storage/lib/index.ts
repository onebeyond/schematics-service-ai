import { Logger } from '@nestjs/common';
import { JSONLoader } from 'langchain/document_loaders/fs/json';
import { Document } from 'langchain/document';
import { file as tmpFile } from 'tmp';
import * as fs from 'fs';

export const transformDoc =
  (originalFilename: string) =>
  (doc: Document, i: number): Document => ({
    ...doc,
    metadata: {
      ...doc.metadata,
      originalFilename,
      sourceId: `${originalFilename}-${i}`,
    },
  });

export const streamCopy = (logger: Logger, inputStream: any): Promise<string> =>
  new Promise((resolve, reject) => {
    tmpFile((err, path) => {
      if (err) {
        reject(err);
      }
      // Create a write stream to the temporary file
      const writeStream = fs.createWriteStream(path);
      writeStream.on('finish', () => {
        logger.debug(`End of writing to tmp file ${path}`);
        resolve(path);
      });
      writeStream.on('error', reject);
      // Pipe the download stream to the write stream
      inputStream.pipe(writeStream);
    });
  });

export const json2Documents = async (logger: Logger, filePath: string): Promise<Document<Record<string, any>>[]> => {
  const loader = new JSONLoader(filePath);
  const docs = await loader.loadAndSplit();

  logger.log(`extracted ${docs.length} documents from ${filePath}`);
  return docs.map((doc: Document) => ({
    ...doc,
    metadata: {
      ...doc.metadata,
    },
  }));
};

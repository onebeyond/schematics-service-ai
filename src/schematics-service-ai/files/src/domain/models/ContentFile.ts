export class ContentFile {
  id: string;
  description?: string;
  fileName: string;
  filePath: string;
  createdAt: Date;
}

export class CloudContentFile extends ContentFile {
  containerOrBucket: string;
  prefix?: string;
  blobName: string;
}

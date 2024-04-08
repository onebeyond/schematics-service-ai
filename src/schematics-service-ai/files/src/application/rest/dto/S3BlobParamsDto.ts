import { ApiProperty } from '@nestjs/swagger';

export class S3BlobParamsDto {
  @ApiProperty()
  bucket?: string;

  @ApiProperty({
    description: 'The prefix or folder containing the blob or to load all its contents.',
    example: 'prefix/path/to/folder',
  })
  prefix?: string;

  @ApiProperty({
    description: 'The full name of the blob to load. If prefix is needed, specify prefix parameter.',
    example: 'blobname.ext',
  })
  blobName?: string;
}

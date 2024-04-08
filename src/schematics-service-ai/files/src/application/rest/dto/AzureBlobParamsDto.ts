import { ApiProperty } from '@nestjs/swagger';

export class AzureBlobParamsDto {
  @ApiProperty()
  container?: string;

  @ApiProperty({
    description: 'The prefix or folder containing the blob or to load all its contents.',
    example: 'prefix/path/to/folder',
  })
  prefix?: string;

  @ApiProperty({
    description: 'The name of the blob to load. If in a folder, specify prefix parameter',
    example: 'blobname.ext',
  })
  blobName?: string;
}

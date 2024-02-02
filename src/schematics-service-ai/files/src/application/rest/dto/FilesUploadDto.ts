import { ApiProperty } from '@nestjs/swagger';

export class FilesUploadDto {
  @ApiProperty({
    description:
      'The description of the content that will be indexed as metadata along the content.',
    example: 'This contains info about this certain area in this way',
  })
  description: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description:
      'The files to upload. The files must be of type pdf or csv and must not exceed 5MB.',
  })
  files: any[];
}

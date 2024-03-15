import { ApiProperty } from '@nestjs/swagger';

export class NotionParamsDto {
  @ApiProperty({
    description: 'The pageId/blockid of the (root) page we want to index.',
    example: '32 character length string (uuid): dee117e221d8447777b9669a41fa633a',
  })
  pageId?: string;
}

import { ApiProperty } from '@nestjs/swagger';

export class MongoDBParamsDto {
  @ApiProperty({
    description: 'The database name to use',
    example: 'any valid mongodb database name',
  })
  dbName?: string;
  @ApiProperty({
    description: 'The collection where the data is goingo to be got.',
    example: 'any valid mongodb collection name',
  })
  collection?: string;
}

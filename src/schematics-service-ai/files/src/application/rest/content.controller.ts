import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Res,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';

import {
  FilesUploadDto,
  FileUploadParamsDto,
  NotionParamsDto,
  MongoDBParamsDto,
  AzureBlobParamsDto,
  S3BlobParamsDto,
  PromptParamsDto,
} from './dto';

import { ContentService } from '../../domain/services/content/content.service';
@Controller({
  path: 'content',
  version: '1',
})
@ApiTags('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  static makeResponse(response: Response, res: any): Response {
    const status: number = typeof res === 'object' ? Number(res.message.split('|')[0]) : HttpStatus.CREATED;
    const data = typeof res == 'number' ? res : undefined;

    return response.status(status).send(data);
  }

  @Get()
  @ApiOperation({
    summary: 'Retrieves all content from the search engine.',
  })
  async search() {
    return await this.contentService.search();
  }

  @Get('status')
  @ApiOperation({
    summary: 'Just return app status',
  })
  async status() {
    return { status: 'ok' };
  }

  @Post('embed/upload/files')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({
    summary: 'Uploads files to the service and indexes them in the search engine.', // eslint-disable-line
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: FilesUploadDto,
  })
  async uploadFile(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1000 * 1000 }),
          new FileTypeValidator({
            fileType: RegExp('^(application/pdf|text/csv)$'),
          }),
        ],
      }),
    )
    files: Array<Express.Multer.File>,
    @Body() fileUploadParamsDto: FileUploadParamsDto,
  ) {
    await this.contentService.processFiles(files, fileUploadParamsDto.description);
  }

  @Post('embed/from/azure')
  @ApiOperation({
    summary: 'Import the content of a blob from an Azure Storage container',
  })
  async loadFromAzureBlob(@Body() azureBlobParams: AzureBlobParamsDto, @Res() response: Response) {
    const res: number | Error = await this.contentService.loadAzureBlobFile(azureBlobParams);
    return ContentController.makeResponse(response, res);
  }

  @Post('embed/from/s3')
  @ApiOperation({
    summary: 'Import the content of a blob from a S3 bucket',
  })
  async loadFromS3Blob(@Body() s3BlobParams: S3BlobParamsDto, @Res() response: Response) {
    const res: number | Error = await this.contentService.loadS3BlobFile(s3BlobParams);
    return ContentController.makeResponse(response, res);
  }

  @Post('embed/from/notion')
  @ApiOperation({
    summary: 'Import notion data (from page `pageId`) and children pages',
  })
  async loadAndStoreNotionDocs(@Body() notionParams: NotionParamsDto, @Res() response: Response) {
    const { pageIds } = notionParams;
    const res: number | Error = await this.contentService.processNotionPages(pageIds);
    return ContentController.makeResponse(response, res);
  }

  @Post('embed/from/mongodb')
  @ApiOperation({
    summary: 'Load remote data from mongodb collection. If not `collection` in params, will pick from configuration',
  })
  async loadAndProcessMongoDBData(@Body() mongoParams: MongoDBParamsDto, @Res() response: Response) {
    const { dbName, collections } = mongoParams;
    const result: number | Error = await this.contentService.processNoSQLData(dbName, collections);

    return ContentController.makeResponse(response, result);
  }

  @Delete('/:id')
  @ApiOperation({
    summary: 'Deletes a file and its content by id from the search engine',
  })
  async deleteFileById(@Param('id') id: string) {
    await this.contentService.deleteContentById(id);
  }

  @Post('prompt')
  @ApiOperation({
    summary: 'Uses a prompt to generate content retrieved from the search engine.', // eslint-disable-line
  })
  async usePrompt(@Body() promptParams: PromptParamsDto) {
    const { template, prompt } = promptParams;
    return await this.contentService.usePrompt(prompt, template);
  }

  @Get('similarity-search')
  @ApiOperation({
    summary: 'Performs a semantic search based on query terms.',
  })
  async similaritySearch(@Query('term') term: string, @Query('count') count: number = 10): Promise<any> {
    const { results } = await this.contentService.similaritySearch(term);
    return results.slice(0, count).map((r) => ({ _id: r._id, text: r._source.text, score: r.score }));
  }
}

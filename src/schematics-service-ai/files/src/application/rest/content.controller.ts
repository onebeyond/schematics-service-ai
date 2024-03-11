import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FilesUploadDto } from './dto/FilesUploadDto';
import { PromptParamsDto } from './dto/PromptParamsDto';
import { FileUploadParamsDto } from './dto/FileUploadParamsDto';
import { NotionParamsDto } from './dto/NotionParamsDto';
import { ContentService } from '../../domain/services/content/content.service';
import { MongoDBParamsDto } from './dto/MongoDBParamsDto';

@Controller({
  path: 'content',
  version: '1',
})
@ApiTags('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

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

  @Post('upload-files')
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

  @Post('embed-notion')
  @ApiOperation({
    summary: 'Import notion data (from page `pageId`) and children pages',
  })
  async loadAndStoreNotionDocs(@Body() notionParams: NotionParamsDto) {
    const { pageId } = notionParams;
    await this.contentService.processNotionPages(pageId);
  }

  @Post('embed-mongodb')
  @ApiOperation({
    summary:
      'Load remote data from mongodb collection. If not `collection` in params, will pick from configuration',
  })
  async loadAndProcessMongoDBData(@Body() mongoParams: MongoDBParamsDto) {
    const { dbName, collection } = mongoParams;
    const result: number = await this.contentService.processNoSQLData(dbName, collection);

    return { processed: result };
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
    return await this.contentService.usePrompt(promptParams.prompt, promptParams.template);
  }
}

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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FilesUploadDto } from './dto/FilesUploadDto';
import { ContentService } from '../../domain/services/content/content.service';
import { PromptParamsDto } from './dto/PromptParamsDto';
import { FileUploadParamsDto } from './dto/FileUploadParamsDto';

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

  @Post('upload-files')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({
    summary:
      'Uploads files to the service and indexes them in the search engine.',
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
    await this.contentService.processFiles(
      files,
      fileUploadParamsDto.description,
    );
  }

  @Delete('/:id')
  @ApiOperation({
    summary: 'Deletes a file and its content by id from the search engine',
  })
  async deleteFileById(@Param('id') id: string) {
    await this.contentService.deleteContentById(id);
  }

  @Post('embeddings')
  @ApiOperation({
    summary: 'Generates vector embeddings from the search engine.',
  })
  async generateEmbeddings() {
    return await this.contentService.addDocuments();
  }

  @Post('prompt')
  @ApiOperation({
    summary:
      'Uses a prompt to generate content retrieved from the search engine.',
  })
  async usePrompt(@Body() promptParams: PromptParamsDto) {
    return await this.contentService.usePrompt(
      promptParams.prompt,
      promptParams.template,
    );
  }

  @Post('agnostic-prompt')
  @ApiOperation({
    summary:
        'Uses a prompt to generate agnostic content from the search engine.',
  })
  async useAgnosticPrompt(@Body() promptParams: PromptParamsDto) {
    return await this.contentService.useAgnosticPrompt(
        promptParams.prompt,
    );
  }
}

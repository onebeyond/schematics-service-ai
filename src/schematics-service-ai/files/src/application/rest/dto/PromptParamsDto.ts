import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class PromptParamsDto {
  @ApiProperty({
    description: 'The prompt to use for generating the content.',
    example: 'How many times something has happened in this certain area?',
  })
  prompt: string;

  @ApiProperty({
    description:
      'An optional template to specify the model how to generate the answer.' +
      " It's important to add the keywords {question} and {context}," +
      ' where the question is the prompt and the context is the data retrieved that will be used to generate the response',
    example:
      'You are an expert in a certain area. Answer this question: {question}\n Using this context: {context}\nAnswer in a concise manner',
  })
  @IsOptional()
  template?: string;
}

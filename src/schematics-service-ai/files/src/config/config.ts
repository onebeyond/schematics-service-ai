import { IsNumber, IsOptional, IsPort, IsString } from 'class-validator';
import * as process from 'process';

export class EnvVariables {
  @IsPort()
  @IsOptional()
  PORT = '4000';

  @IsString()
  @IsOptional()
  NODE_ENV = 'development';

  @IsString()
  @IsOptional()
  LOGGING_LEVEL = 'info';

  @IsString()
  npm_package_name: string;

  @IsString()
  npm_package_version: string;

  @IsString()
  @IsOptional()
  npm_package_description: '';

  @IsString()
  AZURE_OPENAI_API_KEY: string;

  @IsString()
  AZURE_OPENAI_API_VERSION: string;

  @IsString()
  AZURE_OPENAI_API_INSTANCE_NAME: string;

  @IsString()
  AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME: string;

  @IsString()
  AZURE_OPENAI_API_CHAT_DEPLOYMENT_NAME: string;

  @IsNumber()
  @IsOptional()
  AZURE_OPENAI_API_CHAT_TEMPERATURE = 0.9;

  @IsString()
  ELASTICSEARCH_URL: string;
}

export class ConfigValues {
  public readonly port: number;
  public readonly environment: string;
  public readonly loggingLevel: string;
  public readonly service: {
    name: string;
    version: string;
    description: string;
  };
  public readonly azure: {
    openai: {
      apiKey: string;
      apiVersion: string;
      apiInstanceName: string;
      apiEmbeddingsDeploymentName: string;
      apiChatDeploymentName: string;
      apiChatTemperature: number;
    };
  };
  public readonly elasticsearch: {
    url: string;
    index?: string;
  };
  public readonly mongodb: {
    url: string;
    dbName?: string;
    collectionName?: string;
  };
  public readonly notion: {
    notionIntegrationToken: string,
    pageIds?: string[],
  }
}

export const configValues = (): ConfigValues => ({
  service: {
    name: process.env.npm_package_name,
    version: process.env.npm_package_version,
    description: process.env.npm_package_description,
  },
  azure: {
    openai: {
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION,
      apiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
      apiEmbeddingsDeploymentName:
        process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME,
      apiChatDeploymentName: process.env.AZURE_OPENAI_API_CHAT_DEPLOYMENT_NAME,
      apiChatTemperature: Number(process.env.AZURE_OPENAI_API_CHAT_TEMPERATURE),
    },
  },
  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL,
  },
  port: Number(process.env.PORT),
  environment: process.env.NODE_ENV,
  loggingLevel: process.env.LOGGING_LEVEL,
  mongodb: {
    url: process.env.MONGO_URL,
  },
  notion: {
    notionIntegrationToken: process.env.NOTION_INTEGRATION_TOKEN,
  }
});

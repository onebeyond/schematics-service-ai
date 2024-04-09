import { IsNumber, IsOptional, IsPort, IsString } from 'class-validator';
import { Document } from 'langchain/document';
import * as process from 'process';

export class EnvVariables {
  @IsPort()
  @IsOptional()
  PORT = '5555';

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

  @IsString()
  @IsOptional()
  NOTION_INTEGRATION_TOKEN: string;

  @IsString()
  @IsOptional()
  MONGO_URL: string;

  @IsString()
  @IsOptional()
  AZURE_STORAGE_CONNSTRING: string;

  @IsString()
  @IsOptional()
  AZURE_STORAGE_CONTAINER: string;

  @IsString()
  @IsOptional()
  AWS_S3_ACCESSKEY: string;

  @IsString()
  @IsOptional()
  AWS_S3_SECRETKEY: string;

  @IsString()
  @IsOptional()
  AWS_S3_REGION: string;

  @IsString()
  @IsOptional()
  AWS_S3_BUCKET: string;
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
  public readonly recordManager: {
    database: {
      type: 'postgres' | string;
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
    };
    tableName: string;
  };

  public readonly indexingStrategy?: 'full' | 'incremental' | undefined;

  public readonly elasticsearch: {
    url: string;
    index: string;
  };
  public readonly storage: {
    azure?: {
      connString: string;
      container?: string;
    };
    s3?: {
      credentials: {
        accessKey: string;
        secretKey: string;
      };
      region: string;
      bucket: string;
    };
  };
  public readonly notion: {
    integrationToken: string;
    pageIds?: string;
    transform?: (data: any) => Document;
  };
  public readonly mongodb: {
    connectionString: string;
    dbName?: string;
    collections?: string;
    transform?: (data: any) => Document;
  };
  public readonly promptTemplate?: string;
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
      apiEmbeddingsDeploymentName: process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME,
      apiChatDeploymentName: process.env.AZURE_OPENAI_API_CHAT_DEPLOYMENT_NAME,
      apiChatTemperature: Number(process.env.AZURE_OPENAI_API_CHAT_TEMPERATURE),
    },
  },
  recordManager: {
    database: {
      type: 'postgres',
      host: process.env.PG_HOST,
      port: Number(process.env.PG_PORT),
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DB,
    },
    tableName: 'obai_upsertion_records',
  },
  indexingStrategy: 'incremental',

  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL,
    index: 'elastic_index',
  },
  port: Number(process.env.PORT),
  environment: process.env.NODE_ENV,
  loggingLevel: process.env.LOGGING_LEVEL,

  storage: {
    azure: {
      connString: process.env.AZURE_STORAGE_CONNSTRING,
      container: process.env.AZURE_STORAGE_CONTAINER,
    },
    s3: {
      credentials: {
        accessKey: process.env.AWS_S3_ACCESSKEY,
        secretKey: process.env.AWS_S3_SECRETKEY,
      },
      region: process.env.AWS_S3_REGION,
      bucket: process.env.AWS_S3_BUCKET,
    },
  },
  notion: {
    integrationToken: process.env.NOTION_INTEGRATION_TOKEN,
  },
  mongodb: {
    connectionString: process.env.MONGO_URL,
    dbName: 'db_name',
    collections: 'mongo_collection',
  },
});

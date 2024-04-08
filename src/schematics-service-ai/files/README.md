# ob-service-ai

## 1. Description

This service is intended to be used as a template to cover 80% of the projects that requires some kind of AI support. 

It has been implemented using Typescript and NestJS in order to be as much as standard as possible.

With this service you can upload some files as data and get answers from the AI model based on that data.

### High-level architecture

So far we are following the typical architecture to apply when building Generative AI applications, which is depicted in the next diagram:

![Application diagram](./ServiceAI%20arch.png)

As this service is intended to be addressed to a generic purpose, more _data sources_ interface (_infra repos_) to load data from will be added. Also, so far the only _client adapter_ is a http one, but more are to be added, especially a slack bot. 

So, the main idea is to _implement this architecture_ in a _generic way_ rather than being applied to a concrete case, hence being used as a starter/skeleton for custom projects.


## 2. Dependencies

This is a template service, and in order to cover the 80% of the use cases, it has been designed to work initially with Azure services. It's required to have:
- A openAI Azure service with a embedding deployment (ada2) and a chat deployment (gpt).
- (not implemented yet) A Azure storage account to store the data files.
- (not implemented yet) An application insights instance to log the service activity.
- An ElasticSearch instance to manage content and embeddings
- A service to run docker containers (k8s, app containers, app services, etc.). You could host on AWS or wherever indeed.

You could need Key Vault to manage config, but that's not mandatory, it's up to you how to manage the deployment and configuration.

### 3. Configuration

You will require to set the following environment variables (injecting on environment or via .env for development):
- `LOGGING_LEVEL`: `debug|info|warn|error`. Default `info`.
- `PORT`: port number. Default `3000`.
- `AZURE_OPENAI_API_KEY`: azure openai api key.
- `AZURE_OPENAI_API_VERSION`: azure openai api version.
- `AZURE_OPENAI_API_INSTANCE_NAME`: azure openai instance name.
- `AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME`: embedding deployment name.
- `AZURE_OPENAI_API_CHAT_DEPLOYMENT_NAME` chat deployment name.
- `ELASTICSEARCH_URL`: elastic search url or connection string.

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ContentService } from '../src/domain/services/content/content.service';
import { ContentController } from '../src/application/rest/content.controller';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  const contentServiceMock = {
    processNotionPages: jest.fn(),
    processNoSQLData: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ContentController],
      providers: [
        {
          provide: ContentService,
          useValue: contentServiceMock,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(() => jest.clearAllMocks());

  it('/status (GET)', () => {
    return request(app.getHttpServer()).get('/content/status').expect(200).expect({ status: 'ok' });
  });

  it('embed multiple notion pages: POST /embed-notion pageIds=page1,page2', (done) => {
    const payload = { pageIds: 'page1,page2' };
    request(app.getHttpServer())
      .post('/content/embed-notion')
      .send(payload)
      .expect(201)
      .end((err, resp) => {
        expect(err).toBeNull();
        expect(resp).toBeDefined();
        expect(contentServiceMock.processNotionPages).toHaveBeenCalledWith(payload.pageIds);
        done();
      });
  });

  it('no pageIds when embedding notion: POST /embed-notion', (done) => {
    request(app.getHttpServer())
      .post('/content/embed-notion')
      .send()
      .expect(201)
      .end((err, resp) => {
        expect(err).toBeNull();
        expect(resp).toBeDefined();
        expect(contentServiceMock.processNotionPages).toHaveBeenCalledWith(undefined);
        done();
      });
  });

  it('multiple collections when embedding mongo data: POST /embed-mongodb collections=coll1,coll2,coll3', (done) => {
    request(app.getHttpServer())
      .post('/content/embed-mongodb')
      .send({ collections: 'coll1,coll2,coll3' })
      .expect(201)
      .end((err, resp) => {
        expect(err).toBeNull();
        expect(resp).toBeDefined();
        expect(contentServiceMock.processNoSQLData).toHaveBeenCalledWith(undefined, 'coll1,coll2,coll3');
        done();
      });
  });
});

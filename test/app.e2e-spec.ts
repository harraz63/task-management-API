import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/presentation/filters/global-exception.filter';

describe('Task Management API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  async function cleanE2eData(): Promise<void> {
    const users = await prisma.user.findMany({
      where: {
        email: {
          endsWith: '@e2e.test',
        },
      },
      select: {
        id: true,
      },
    });
    const userIds = users.map((user) => user.id);

    if (userIds.length === 0) {
      return;
    }

    await prisma.refreshToken.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });
    await prisma.task.deleteMany({
      where: {
        project: {
          ownerId: {
            in: userIds,
          },
        },
      },
    });
    await prisma.project.deleteMany({
      where: {
        ownerId: {
          in: userIds,
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: userIds,
        },
      },
    });
  }

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'e2e-access-secret';
    process.env.JWT_REFRESH_SECRET ??= 'e2e-refresh-secret';
    process.env.BCRYPT_SALT_ROUNDS = '4';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();

    prisma = app.get(PrismaService);
    await cleanE2eData();
  });

  afterAll(async () => {
    await cleanE2eData();
    await app.close();
  });

  it('registers, logs in, creates a project, and creates a task for that project', async () => {
    const email = `flow-${Date.now()}@e2e.test`;
    const password = 'Password123!';
    const httpServer = app.getHttpServer();

    await request(httpServer)
      .post('/auth/register')
      .send({
        name: 'E2E User',
        email,
        password,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          name: 'E2E User',
          email,
          role: 'USER',
        });
        expect(body.id).toEqual(expect.any(String));
      });

    const loginResponse = await request(httpServer)
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(200);

    expect(loginResponse.body.accessToken).toEqual(expect.any(String));
    expect(loginResponse.body.refreshToken).toEqual(expect.any(String));

    const accessToken = loginResponse.body.accessToken as string;

    const projectResponse = await request(httpServer)
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'E2E Project',
        description: 'Created by the e2e flow.',
      })
      .expect(201);

    expect(projectResponse.body).toMatchObject({
      name: 'E2E Project',
      description: 'Created by the e2e flow.',
    });
    expect(projectResponse.body.id).toEqual(expect.any(String));

    const projectId = projectResponse.body.id as string;

    const taskResponse = await request(httpServer)
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'E2E Task',
        description: 'Created by the e2e flow.',
        projectId,
      })
      .expect(201);

    expect(taskResponse.body).toMatchObject({
      title: 'E2E Task',
      description: 'Created by the e2e flow.',
      status: 'TODO',
      priority: 'MEDIUM',
      projectId,
    });
    expect(taskResponse.body.id).toEqual(expect.any(String));
  });
});

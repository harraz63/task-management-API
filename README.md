# Task Management API

A NestJS REST API for user authentication, project management, and task management. The codebase follows a layered architecture: domain models and repository contracts live away from framework and database details, application services hold use cases, Prisma and Redis live in infrastructure, and HTTP controllers/guards/DTOs live in presentation.

## Tech stack

- Node.js, TypeScript, NestJS 11
- PostgreSQL 16 with Prisma ORM
- Redis 7 with `ioredis`
- JWT access and refresh tokens
- bcrypt password hashing
- class-validator/class-transformer request validation
- Swagger/OpenAPI docs
- Jest and Supertest for tests
- Docker Compose for local infrastructure and full-stack runs

## Run with Docker

Create a `.env` file first:

```bash
cp .env.example .env
```

Then start the full stack with one command:

```bash
docker compose up --build
```

The API will be available at `http://localhost:3000`. Swagger docs are available at `http://localhost:3000/api/docs`.

The Docker image runs `npx prisma migrate deploy` before starting the compiled NestJS app, so committed migrations are applied automatically for Docker/production-style runs.

## Run locally without Docker

You need local PostgreSQL and Redis running, then:

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev
```

The default `.env.example` values target local services on `localhost:5432` and `localhost:6379`. Adjust `DATABASE_URL`, `REDIS_HOST`, and `REDIS_PORT` if your local services use different credentials, hosts, or ports.

## Environment variables

All required and optional runtime variables are listed in `.env.example` with safe placeholder values.

| Variable | Description | Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma | `postgresql://postgres:postgres@localhost:5432/junior_assessment?schema=public` |
| `JWT_ACCESS_SECRET` | Secret used to sign access tokens | `replace-with-access-secret` |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime | `15m` |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens | `replace-with-refresh-secret` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` |
| `BCRYPT_SALT_ROUNDS` | bcrypt cost factor for password hashing | `12` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `PORT` | HTTP server port | `3000` |
| `THROTTLE_TTL` | Global rate-limit window in seconds | `60` |
| `THROTTLE_LIMIT` | Global request limit per window | `100` |

## Database migrations

Use Prisma migrations in development:

```bash
npx prisma migrate dev
```

Use deploy mode for Docker and production environments:

```bash
npx prisma migrate deploy
```

The Dockerfile already wires `npx prisma migrate deploy` into container startup.

## Architecture

The source is split into four main layers:

- `src/domain`: entities, enums, and repository interfaces. This layer has the business vocabulary and does not know about NestJS, Prisma, Redis, or HTTP.
- `src/application`: use-case services for auth, users, projects, and tasks. These services depend on domain repository interfaces.
- `src/infrastructure`: concrete implementations for Prisma repositories, Redis caching, and bcrypt hashing.
- `src/presentation`: controllers, DTOs, guards, decorators, filters, and middleware.

Prisma sits behind repository interfaces such as `UserRepository`, `ProjectRepository`, `TaskRepository`, and `RefreshTokenRepository`. That keeps business logic decoupled from the ORM, makes application services easier to test, and lets infrastructure details change without rewriting the domain/application layers.

Prisma was chosen because it provides a type-safe generated client, schema-first migrations, and a simple developer experience. The repository pattern keeps those benefits while still meeting the layered-architecture requirement.

Architecture and request-flow diagrams are available in [docs/architecture.md](docs/architecture.md).

## Auth and authorization

Users register with `POST /auth/register` and log in with `POST /auth/login`. Registration always creates a `USER` account.

Login returns:

- an access token for authenticated API requests;
- a refresh token for requesting a new token pair;
- the authenticated user profile.

Refresh tokens are stored as SHA-256 hashes and rotate on `POST /auth/refresh`: the used refresh token is revoked and a new access/refresh pair is issued. `POST /auth/logout` revokes the provided refresh token for the current user.

Protected routes use the JWT guard. Role-based routes use the roles guard/decorator infrastructure. Project and task access also performs ownership checks in the application services. When a user requests another user's project or task, the API returns `404 Not Found` instead of `403 Forbidden` so resource existence is not leaked.

To test the `ADMIN` role manually, register a normal user, then run Prisma Studio:

```bash
npx prisma studio
```

Open the `User` table and change that user's `role` from `USER` to `ADMIN`.

## Redis caching

Project detail reads are cached for regular users and admins after `GET /projects/:id`.

- Cache key format: `project:{ownerId}:{projectId}`
- TTL: 300 seconds
- Cached data: the serialized project detail response
- Invalidation: `PATCH /projects/:id` and `DELETE /projects/:id` delete the matching project cache key

Redis is intentionally best-effort. If Redis is down or a cache operation fails, the API logs a warning and continues with the database path.

## API overview

Swagger docs are available at `/api/docs` once the API is running.

Common protected-route header:

```http
Authorization: Bearer <accessToken>
```

Core endpoints:

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Health check |
| `POST` | `/auth/register` | Register a user |
| `POST` | `/auth/login` | Log in and receive tokens |
| `POST` | `/auth/refresh` | Rotate refresh token and receive a new token pair |
| `POST` | `/auth/logout` | Revoke a refresh token |
| `GET` | `/auth/me` | Get current user profile |
| `PATCH` | `/users/me` | Update current user's profile |
| `POST` | `/projects` | Create a project |
| `GET` | `/projects` | List visible projects |
| `GET` | `/projects/:id` | Get one visible project |
| `PATCH` | `/projects/:id` | Update one owned/visible project |
| `DELETE` | `/projects/:id` | Delete one owned/visible project |
| `POST` | `/tasks` | Create a task in an owned/visible project |
| `GET` | `/tasks` | List visible tasks |
| `GET` | `/tasks/:id` | Get one visible task |
| `PATCH` | `/tasks/:id` | Update one visible task |
| `DELETE` | `/tasks/:id` | Delete one visible task |

## Manual test flow

1. Register a user with `POST /auth/register`.
2. Log in with `POST /auth/login` and copy the returned `accessToken`.
3. Create a project with `POST /projects`.
4. Create a task with `POST /tasks` using the returned project ID.
5. Call `GET /projects/:id` twice. The first call fills Redis, and the second call should be served from the cached `project:{ownerId}:{projectId}` entry when Redis is available.
6. Update the project with `PATCH /projects/:id`. This invalidates the project cache key.
7. Call `GET /projects/:id` again to repopulate the cache with updated data.
8. Register and log in as a second user.
9. Confirm the second user receives `404 Not Found` when trying to access the first user's project or task.

## Tests

```bash
npm run test
npm run test:e2e
```

The e2e test expects `DATABASE_URL` to point at a reachable PostgreSQL database with migrations applied. Redis is optional for the test because cache failures degrade gracefully.

## Useful scripts

| Command | Description |
| --- | --- |
| `npm run start:dev` | Start the API in watch mode |
| `npm run build` | Compile TypeScript |
| `npm run start:prod` | Run the compiled app |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate:dev` | Run development migrations |
| `npm run prisma:migrate:deploy` | Apply committed migrations |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run e2e tests |
| `npm run lint` | Run ESLint with fixes |

## Postman

A Postman collection is included at:

```text
postman/task-management-api.postman_collection.json
```

## License

UNLICENSED - private project.

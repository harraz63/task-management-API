# Task Management API

A NestJS REST API for user authentication, profile management, and project CRUD. Built with clean architecture layers (domain, application, infrastructure, presentation), PostgreSQL via Prisma, and Redis caching for project reads.

## Tech stack

- **Runtime:** Node.js, TypeScript, NestJS 11
- **Database:** PostgreSQL 16 (Prisma ORM)
- **Cache:** Redis 7 (project detail caching)
- **Auth:** JWT access + refresh tokens, bcrypt password hashing
- **Validation:** class-validator / class-transformer
- **Rate limiting:** @nestjs/throttler

## Prerequisites

- Node.js 18+
- Docker & Docker Compose (recommended), or local PostgreSQL and Redis
- npm

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy the example file and adjust values as needed:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_ACCESS_SECRET` | Secret for access tokens | — |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | — |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `BCRYPT_SALT_ROUNDS` | bcrypt cost factor | `12` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `PORT` | HTTP port | `3000` |
| `THROTTLE_TTL` | Rate-limit window (seconds) | `60` |
| `THROTTLE_LIMIT` | Max requests per window | `100` |

### 3. Start infrastructure

```bash
docker compose up -d postgres redis
```

Or start the full stack (app + database + Redis):

```bash
docker compose up -d
```

### 4. Run database migrations

```bash
npm run prisma:migrate:dev
npm run prisma:generate
```

### 5. Run the API

```bash
# development (watch mode)
npm run start:dev

# production build
npm run build
npm run start:prod
```

The server listens on `http://localhost:3000` by default.

## API reference

All JSON endpoints accept and return `application/json` unless noted. Protected routes require:

```
Authorization: Bearer <accessToken>
```

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | No | Health check — returns `Hello World!` |

### Auth

Auth routes are throttled to **5 requests / 60 seconds**.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | No | Create a user account |
| `POST` | `/auth/login` | No | Login — returns access + refresh tokens and user profile |
| `POST` | `/auth/refresh` | No | Rotate tokens using a refresh token |
| `POST` | `/auth/logout` | Yes | Revoke refresh token (`204 No Content`) |
| `GET` | `/auth/me` | Yes | Get current user profile |

**Register / login body**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password123!"
}
```

Login omits `name`. Password must be at least 8 characters; name at least 2.

**Login response**

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "user": {
    "id": "uuid",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "USER",
    "createdAt": "2026-06-13T10:00:00.000Z",
    "updatedAt": "2026-06-13T10:00:00.000Z"
  }
}
```

**Refresh / logout body**

```json
{
  "refreshToken": "<jwt>"
}
```

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `PATCH` | `/users/me` | Yes | Update current user's name and/or password |

**Body** (all fields optional)

```json
{
  "name": "Jane Smith",
  "password": "NewPassword123!"
}
```

Returns the updated user profile (same shape as `/auth/me`).

### Projects

All project routes require authentication. Regular users can only access their own projects; `ADMIN` users can list and access any project.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/projects` | Yes | Create a project |
| `GET` | `/projects` | Yes | List projects (owned, or all if admin) |
| `GET` | `/projects/:id` | Yes | Get a project by ID |
| `PATCH` | `/projects/:id` | Yes | Update a project |
| `DELETE` | `/projects/:id` | Yes | Delete a project (`204 No Content`) |

**Create body**

```json
{
  "name": "My Project",
  "description": "Optional description"
}
```

**Update body** (all fields optional)

```json
{
  "name": "Renamed Project",
  "description": "Updated description"
}
```

**Project response**

```json
{
  "id": "uuid",
  "name": "My Project",
  "description": "Optional description",
  "ownerId": "uuid",
  "createdAt": "2026-06-13T10:00:00.000Z",
  "updatedAt": "2026-06-13T10:00:00.000Z"
}
```

Project detail reads are cached in Redis for 5 minutes per owner/project pair.

## Postman collection

Import the collection to exercise every endpoint with pre-configured variables and test scripts:

```
postman/task-management-api.postman_collection.json
```

**Suggested flow**

1. **Register** → **Login** (tokens saved automatically)
2. **Get Current User** or **Update Profile**
3. **Create Project** → **List Projects** → **Get Project** → **Update Project**
4. **Refresh Token** when the access token expires
5. **Logout** when done

Collection variables: `baseUrl`, `accessToken`, `refreshToken`, `userId`, `projectId`, and sample user credentials.

## Project structure

```
src/
├── domain/           # Entities, enums, repository interfaces
├── application/      # Use cases (auth, users, projects services)
├── infrastructure/   # Prisma, Redis, bcrypt implementations
└── presentation/     # Controllers, DTOs, guards, decorators
prisma/
└── schema.prisma     # Database schema
postman/              # Postman collection
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Compile TypeScript |
| `npm run start:prod` | Run compiled app |
| `npm run prisma:migrate:dev` | Apply migrations (dev) |
| `npm run prisma:migrate:deploy` | Apply migrations (prod) |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |
| `npm run lint` | ESLint |

## Error responses

Validation and business errors follow the standard NestJS format:

```json
{
  "statusCode": 400,
  "message": ["email must be an email"],
  "error": "Bad Request"
}
```

Common status codes: `400` validation, `401` unauthorized, `404` not found, `409` conflict (duplicate email), `429` rate limit exceeded.

## License

UNLICENSED — private project.

# Architecture and Flow Diagrams

This page collects the main dependency and request flows for the API. The diagrams use Mermaid syntax so they render directly on GitHub.

## Layered Architecture

The source is split into presentation, application, domain, and infrastructure layers. Dependency arrows point toward the code each layer depends on: controllers call application services, services work with domain entities and repository contracts, and infrastructure implements those contracts behind Prisma, Redis, and bcrypt. The domain layer sits at the center and has no outgoing dependencies on NestJS, HTTP, Prisma, Redis, or any other outer layer.

```mermaid
flowchart TD
  subgraph Presentation["Presentation layer"]
    Controllers["Controllers"]
    Guards["Guards, decorators, DTOs, filters, middleware"]
  end

  subgraph Application["Application layer"]
    Services["Auth, users, projects, and tasks services"]
    UseCases["Use cases and orchestration"]
  end

  subgraph Domain["Domain layer"]
    Entities["Entities and enums"]
    Contracts["Repository and security interfaces"]
  end

  subgraph Infrastructure["Infrastructure layer"]
    Prisma["Prisma repositories"]
    Redis["Redis cache"]
    Hashing["bcrypt password hashing"]
  end

  Presentation --> Application
  Application --> Domain
  Infrastructure --> Domain
```

## Authentication Flow

Auth requests enter through `AuthController` and are handled by `AuthService`. User and refresh-token persistence stays behind repository contracts, with refresh tokens stored as hashes and rotated on refresh so the used token is revoked before a new pair is issued.

```mermaid
sequenceDiagram
  autonumber
  participant Client
  participant AuthController
  participant AuthService
  participant UserRepository
  participant RefreshTokenRepository
  participant Database

  Client->>AuthController: POST /auth/register
  AuthController->>AuthService: register(dto)
  AuthService->>UserRepository: findByEmail(email)
  UserRepository->>Database: SELECT user by email
  Database-->>UserRepository: user or null
  UserRepository-->>AuthService: user or null
  alt email already exists
    AuthService-->>AuthController: 409 Conflict
    AuthController-->>Client: 409 Conflict
  else new user
    AuthService->>UserRepository: create(user with hashed password)
    UserRepository->>Database: INSERT user
    Database-->>UserRepository: user
    UserRepository-->>AuthService: user
    AuthService-->>AuthController: user profile
    AuthController-->>Client: 201 Created
  end

  Client->>AuthController: POST /auth/login
  AuthController->>AuthService: login(dto)
  AuthService->>UserRepository: findByEmail(email)
  UserRepository->>Database: SELECT user by email
  Database-->>UserRepository: user or null
  UserRepository-->>AuthService: user or null
  alt invalid email or password
    AuthService-->>AuthController: 401 Unauthorized
    AuthController-->>Client: 401 Unauthorized
  else valid credentials
    AuthService->>RefreshTokenRepository: create(hash(refreshToken), userId, expiresAt)
    RefreshTokenRepository->>Database: INSERT refresh token
    Database-->>RefreshTokenRepository: stored token
    RefreshTokenRepository-->>AuthService: stored token
    AuthService-->>AuthController: access token, refresh token, user profile
    AuthController-->>Client: 200 OK
  end

  Client->>AuthController: POST /auth/refresh
  AuthController->>AuthService: refresh(refreshToken)
  AuthService->>RefreshTokenRepository: findByTokenHash(hash(refreshToken))
  RefreshTokenRepository->>Database: SELECT refresh token
  Database-->>RefreshTokenRepository: stored token or null
  RefreshTokenRepository-->>AuthService: stored token or null
  alt token missing, revoked, or expired
    AuthService-->>AuthController: 401 Unauthorized
    AuthController-->>Client: 401 Unauthorized
  else valid refresh token
    AuthService->>UserRepository: findById(userId)
    UserRepository->>Database: SELECT user by id
    Database-->>UserRepository: user
    UserRepository-->>AuthService: user
    AuthService->>RefreshTokenRepository: revokeById(oldTokenId)
    RefreshTokenRepository->>Database: UPDATE refresh token revoked=true
    Database-->>RefreshTokenRepository: revoked token
    AuthService->>RefreshTokenRepository: create(hash(newRefreshToken), userId, expiresAt)
    RefreshTokenRepository->>Database: INSERT new refresh token
    Database-->>RefreshTokenRepository: stored token
    RefreshTokenRepository-->>AuthService: stored token
    AuthService-->>AuthController: new access token and refresh token
    AuthController-->>Client: 200 OK
  end

  Client->>AuthController: POST /auth/logout
  AuthController->>AuthService: logout(refreshToken, currentUserId)
  AuthService->>RefreshTokenRepository: findByTokenHash(hash(refreshToken))
  RefreshTokenRepository->>Database: SELECT refresh token
  Database-->>RefreshTokenRepository: stored token or null
  RefreshTokenRepository-->>AuthService: stored token or null
  alt token belongs to current user and is active
    AuthService->>RefreshTokenRepository: revokeById(tokenId)
    RefreshTokenRepository->>Database: UPDATE refresh token revoked=true
    Database-->>RefreshTokenRepository: revoked token
  end
  AuthService-->>AuthController: no content
  AuthController-->>Client: 204 No Content
```

## Project Detail Cache Flow

Project detail reads are cached after `GET /projects/:id` using the `project:{ownerId}:{projectId}` key and a 300 second TTL. Redis is best-effort: on a miss, the service falls back to Postgres and fills the cache; on a hit, it returns the cached project response. Updates invalidate the matching key so the next read repopulates Redis with fresh data.

```mermaid
sequenceDiagram
  autonumber
  participant Client
  participant ProjectsController
  participant ProjectsService
  participant Redis
  participant Postgres

  note over Client,Postgres: GET /projects/:id cache miss
  Client->>ProjectsController: GET /projects/:id
  ProjectsController->>ProjectsService: findOne(id, currentUser)
  ProjectsService->>Redis: GET project:{ownerId}:{projectId}
  Redis-->>ProjectsService: miss
  ProjectsService->>Postgres: SELECT visible project
  Postgres-->>ProjectsService: project
  ProjectsService->>Redis: SET project:{ownerId}:{projectId} TTL 300
  Redis-->>ProjectsService: ok
  ProjectsService-->>ProjectsController: project
  ProjectsController-->>Client: 200 OK

  note over Client,Redis: GET /projects/:id cache hit
  Client->>ProjectsController: GET /projects/:id
  ProjectsController->>ProjectsService: findOne(id, currentUser)
  ProjectsService->>Redis: GET project:{ownerId}:{projectId}
  Redis-->>ProjectsService: cached project
  ProjectsService-->>ProjectsController: project
  ProjectsController-->>Client: 200 OK

  note over Client,Redis: PATCH /projects/:id invalidates cache
  Client->>ProjectsController: PATCH /projects/:id
  ProjectsController->>ProjectsService: update(id, dto, currentUser)
  ProjectsService->>Postgres: SELECT visible project, then UPDATE project
  Postgres-->>ProjectsService: updated project
  ProjectsService->>Redis: DEL project:{ownerId}:{projectId}
  Redis-->>ProjectsService: ok
  ProjectsService-->>ProjectsController: updated project
  ProjectsController-->>Client: 200 OK
```

## Task Creation Ownership Flow

Task creation checks project ownership before creating the task. Regular users must create tasks only inside projects they own, and missing or unauthorized projects return `404 Not Found` so the API does not leak whether another user's project exists.

```mermaid
sequenceDiagram
  autonumber
  participant Client
  participant TasksController
  participant TasksService
  participant ProjectRepository
  participant TaskRepository
  participant Database

  Client->>TasksController: POST /tasks
  TasksController->>TasksService: create(dto, currentUser)
  TasksService->>ProjectRepository: findByIdForOwner(projectId, currentUser.id)
  ProjectRepository->>Database: SELECT project by id and ownerId
  Database-->>ProjectRepository: project or null
  ProjectRepository-->>TasksService: project or null
  alt project missing or not owned
    TasksService-->>TasksController: 404 Not Found
    TasksController-->>Client: 404 Not Found
  else project exists and is owned by current user
    TasksService->>TaskRepository: create(task data)
    TaskRepository->>Database: INSERT task
    Database-->>TaskRepository: task
    TaskRepository-->>TasksService: task
    TasksService-->>TasksController: task
    TasksController-->>Client: 201 Created
  end
```

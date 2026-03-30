# FunctionFlow Backend

.NET 8 Web API serving the FunctionFlow task management application.

## Tech Stack

- **.NET 8** with ASP.NET Core
- **Entity Framework Core** with SQLite
- **JWT + API Key** authentication (dual scheme)
- **FluentValidation** for request validation
- **MailKit** for SMTP email delivery
- **Swagger/OpenAPI** documentation (all environments)

## Prerequisites

- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)

## Getting Started

```bash
# From the backend/ directory
cd TodoApi

# Restore packages
dotnet restore

# Run in development mode
dotnet run
```

The API starts on `http://localhost:4001` with Swagger at `/swagger`.

## Configuration

Configuration is loaded from `appsettings.json` and environment variables:

| Setting         | Env Var          | Description                              |
| --------------- | ---------------- | ---------------------------------------- |
| `Jwt:Key`       | `Jwt__Key`       | JWT signing key (required in production) |
| `Jwt:Issuer`    | `Jwt__Issuer`    | JWT issuer (default: FunctionFlow)       |
| `Jwt:Audience`  | `Jwt__Audience`  | JWT audience (default: FunctionFlow)     |
| `Smtp:Host`     | `Smtp__Host`     | SMTP server hostname                     |
| `Smtp:Port`     | `Smtp__Port`     | SMTP server port                         |
| `Smtp:User`     | `Smtp__User`     | SMTP username                            |
| `Smtp:Pass`     | `Smtp__Pass`     | SMTP password                            |
| `Smtp:From`     | `Smtp__From`     | Sender email address                     |
| `Database:Path` | `Database__Path` | SQLite file path (default: data/todo.db) |

In development, a fallback JWT key is used automatically.

## Building

```bash
dotnet build --configuration Release
```

## Testing

```bash
# From the backend/ directory
dotnet test --verbosity normal
```

Tests use `WebApplicationFactory` with an in-memory database and a fake email service — no external dependencies required.

## Authentication

The API supports two authentication methods. All endpoints except `/api/version` and the auth endpoints require one of these:

### JWT Bearer Token

Obtained from `POST /api/auth/verify-code` or `POST /api/auth/dev-login`. Pass it in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### API Key

Generated from the Profile page or `POST /api/keys`. Pass it in the `X-Api-Key` header:

```
X-Api-Key: ff_OqrI7iG8MsH9b67jNlTRonPNh9SR2aWA...
```

> **Note:** These are not interchangeable. JWT tokens use `Authorization: Bearer`, API keys use `X-Api-Key`.

## API Endpoints

### Auth

- `POST /api/auth/request-code` — Request a login code via email
- `POST /api/auth/verify-code` — Verify code and get JWT token
- `POST /api/auth/dev-login` — Create a demo session (no email required)
- `POST /api/auth/demo-logout` — Destroy demo session data

### Tasks

- `GET /api/tasks` — List tasks (with filtering, search, pagination)
- `GET /api/tasks/{id}` — Get a single task
- `POST /api/tasks` — Create a task
- `PUT /api/tasks/{id}` — Update a task
- `DELETE /api/tasks/{id}` — Soft-delete a task

### Lists

- `GET /api/lists` — List all task lists
- `GET /api/lists/{id}` — Get a single list
- `POST /api/lists` — Create a list
- `PUT /api/lists/{id}` — Update a list
- `DELETE /api/lists/{id}` — Delete a list (tasks move to inbox)

### API Keys

- `GET /api/keys` — List API keys (prefix only)
- `POST /api/keys` — Create an API key (full key shown once)
- `DELETE /api/keys/{id}` — Revoke an API key

### Profile

- `GET /api/profile` — Get current user profile
- `PUT /api/profile` — Update profile

### Health

- `GET /api/version` — Version info + health check (no auth required)

## Project Structure

```
TodoApi/
├── Controllers/     # API endpoints
├── Data/            # EF Core DbContext
├── DTOs/            # Request/response records
├── Middleware/      # Error handling
├── Models/          # Domain entities
├── Services/        # Business logic (email, tokens, admin notify, cleanup)
├── Validators/      # FluentValidation rules
└── Program.cs       # App startup & DI configuration
TodoApi.Tests/       # xUnit integration tests
```

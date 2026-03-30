# FunctionFlow

A clean, themeable task management app built with .NET 8 and React.

[![CI](https://github.com/mitchscobell/functionflow/actions/workflows/ci.yml/badge.svg)](https://github.com/mitchscobell/functionflow/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/v/release/mitchscobell/functionflow?label=version&color=brightgreen)](https://github.com/mitchscobell/functionflow/releases/latest)
[![.NET Version](https://img.shields.io/badge/.NET-8.0-512BD4.svg)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4.svg)](https://tailwindcss.com/)
[![xUnit](https://img.shields.io/badge/xUnit-Tests-orange.svg)](backend/TodoApi.Tests/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Tech Stack

| Layer    | Technology                                                  |
| -------- | ----------------------------------------------------------- |
| Backend  | .NET 8 Web API, Entity Framework Core, SQLite               |
| Auth     | JWT + API Key (dual scheme), passwordless email via MailKit |
| Frontend | React 19, Vite 8, TypeScript 5.9, Tailwind CSS 4            |
| Testing  | xUnit, WebApplicationFactory, in-memory database            |
| Infra    | Docker, docker-compose, nginx, GitHub Actions CI            |

## Quick Start

### Development (without Docker)

**Prerequisites:** .NET 8 SDK, Node.js 20+

```bash
# Backend
cd backend/TodoApi
dotnet run

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost** — click **"Dev Login"** to bypass email verification.

The backend API runs on port 4001 with Swagger at http://localhost:4001/swagger.

### Docker

```bash
cp .env.example .env   # edit .env with your secrets
docker compose up --build
```

Open **http://localhost:4000** for the app and **http://localhost:4001** for the API directly.

## Project Structure

```text
functionflow/
├── backend/                  # .NET 8 Web API → see backend/README.md
│   ├── TodoApi/              # API source code
│   │   ├── Controllers/      # Auth, Tasks, Lists, ApiKeys, Profile
│   │   ├── Models/           # User, TodoTask, TaskList, ApiKey, AuthCode
│   │   ├── Data/             # EF Core DbContext
│   │   ├── DTOs/             # Request/response records
│   │   ├── Services/         # Email, Token, AdminNotifier, ApiKey auth, Cleanup
│   │   ├── Validators/       # FluentValidation
│   │   └── Middleware/       # Global error handler
│   ├── TodoApi.Tests/        # Integration tests
│   └── Dockerfile
├── frontend/                 # React SPA → see frontend/README.md
│   ├── src/
│   │   ├── components/       # Layout, TaskCard, TaskModal
│   │   ├── pages/            # Login, Dashboard, Profile, Calendar, Version
│   │   ├── hooks/            # useAuth, useTheme
│   │   ├── lib/              # API client
│   │   └── types/            # TypeScript interfaces
│   ├── nginx.conf
│   └── Dockerfile
├── .github/workflows/        # CI: build, test, version bump
└── docker-compose.yml
```

## API Endpoints

| Method | Route                    | Auth | Description                                 |
| ------ | ------------------------ | ---- | ------------------------------------------- |
| POST   | `/api/auth/request-code` | No   | Send login code to email                    |
| POST   | `/api/auth/verify-code`  | No   | Verify code, get JWT (optional remember me) |
| POST   | `/api/auth/dev-login`    | No   | Dev-only instant login (ephemeral session)  |
| POST   | `/api/auth/demo-logout`  | Yes  | Destroy demo session data                   |
| GET    | `/api/tasks`             | Yes  | List tasks (filter, search, sort, paginate) |
| POST   | `/api/tasks`             | Yes  | Create task                                 |
| GET    | `/api/tasks/:id`         | Yes  | Get single task                             |
| PUT    | `/api/tasks/:id`         | Yes  | Update task                                 |
| DELETE | `/api/tasks/:id`         | Yes  | Soft-delete task                            |
| GET    | `/api/lists`             | Yes  | List all task lists                         |
| POST   | `/api/lists`             | Yes  | Create a list                               |
| GET    | `/api/lists/:id`         | Yes  | Get single list                             |
| PUT    | `/api/lists/:id`         | Yes  | Update list                                 |
| DELETE | `/api/lists/:id`         | Yes  | Delete list (tasks move to inbox)           |
| GET    | `/api/keys`              | Yes  | List API keys (prefix only)                 |
| POST   | `/api/keys`              | Yes  | Create API key (shown once)                 |
| DELETE | `/api/keys/:id`          | Yes  | Revoke API key                              |
| GET    | `/api/profile`           | Yes  | Get user profile                            |
| PUT    | `/api/profile`           | Yes  | Update display name / theme                 |
| GET    | `/api/version`           | No   | Health check + version info                 |

Authentication supports both `Authorization: Bearer <JWT>` and `X-Api-Key: <key>` headers.

## Email Setup (Production)

To enable real email delivery, set these environment variables:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password    # Gmail App Password, not your regular password
SMTP_FROM=your-email@gmail.com
```

In development mode, auth codes are logged to the console instead of sent via email.

## Testing

```bash
cd backend
dotnet test --verbosity normal
```

Integration tests covering auth, task CRUD, lists, API keys, demo sessions, profile, admin notifications, health check, input validation, and user isolation.

## Architecture Decisions

- **SQLite** — zero-config database, perfect for a single-server deployment. Data persists in `data/todo.db`.
- **Passwordless auth** — simpler UX, no password storage/hashing concerns. Codes expire after 10 minutes.
- **Dual auth schemes** — JWT for browser sessions, API keys for programmatic access. Keys are SHA-256 hashed at rest.
- **Soft delete** — tasks are never truly deleted, enabling future undo/audit features.
- **CSS custom properties for theming** — theme switching is instant with no re-render, and new themes can be added with just CSS.
- **Ephemeral demo sessions** — each demo login creates a unique user with sample lists and tasks; all data is destroyed on logout.
- **Rate limiting** — auth endpoints are rate-limited (10 req/min per IP) to prevent abuse.

## License

MIT

# FunctionFlow

A clean, themeable task management app built with .NET 8 and React.

![.NET 8](https://img.shields.io/badge/.NET-8.0-512BD4)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4)

## Features

- **Passwordless auth** — email-based login with 6-digit verification codes
- **Full task CRUD** — create, edit, delete, search, filter, sort, and paginate
- **Three themes** — Function (warm terracotta), Dark, and Light
- **Status workflow** — Todo → In Progress → Done with one-click cycling
- **Priority + tags** — organize tasks with High/Medium/Low priority and custom tags
- **Due date tracking** — overdue tasks are highlighted
- **User profiles** — display name and theme preference per user
- **Dev login** — instant login bypass in development mode

## Tech Stack

| Layer    | Technology                                          |
| -------- | --------------------------------------------------- |
| Backend  | .NET 8 Web API, Entity Framework Core, SQLite       |
| Auth     | JWT (passwordless email codes via MailKit)          |
| Frontend | React 19, Vite 8, TypeScript 5.9, Tailwind CSS 4    |
| Testing  | xUnit, WebApplicationFactory (20 integration tests) |
| Infra    | Docker, docker-compose, nginx                       |

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

Open **http://localhost:3000** — click **"Dev Login"** to bypass email verification.

The backend API runs on port 5000 with Swagger at http://localhost:5000/swagger.

### Docker

```bash
docker compose up --build
```

Open **http://localhost** — the app runs on port 80.

## Project Structure

```
functionflow/
├── backend/
│   ├── TodoApi/              # .NET 8 Web API
│   │   ├── Controllers/      # Auth, Tasks, Profile
│   │   ├── Models/           # User, TodoTask, AuthCode
│   │   ├── Data/             # EF Core DbContext
│   │   ├── DTOs/             # Request/response records
│   │   ├── Services/         # Email, Token
│   │   ├── Validators/       # FluentValidation
│   │   └── Middleware/       # Global error handler
│   ├── TodoApi.Tests/        # Integration tests (20 tests)
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # Layout, TaskCard, TaskModal
│   │   ├── pages/            # Login, Dashboard, Profile
│   │   ├── hooks/            # useAuth, useTheme
│   │   ├── lib/              # API client
│   │   └── types/            # TypeScript interfaces
│   ├── nginx.conf
│   └── Dockerfile
└── docker-compose.yml
```

## API Endpoints

| Method | Route                    | Auth | Description                                 |
| ------ | ------------------------ | ---- | ------------------------------------------- |
| POST   | `/api/auth/request-code` | No   | Send login code to email                    |
| POST   | `/api/auth/verify-code`  | No   | Verify code, get JWT                        |
| POST   | `/api/auth/dev-login`    | No   | Dev-only instant login                      |
| GET    | `/api/tasks`             | Yes  | List tasks (filter, search, sort, paginate) |
| POST   | `/api/tasks`             | Yes  | Create task                                 |
| GET    | `/api/tasks/:id`         | Yes  | Get single task                             |
| PUT    | `/api/tasks/:id`         | Yes  | Update task                                 |
| DELETE | `/api/tasks/:id`         | Yes  | Soft-delete task                            |
| GET    | `/api/profile`           | Yes  | Get user profile                            |
| PUT    | `/api/profile`           | Yes  | Update display name / theme                 |

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

20 integration tests covering auth, task CRUD, profile, input validation, and user isolation.

## Architecture Decisions

- **SQLite** — zero-config database, perfect for a single-server deployment. Data persists in `data/todo.db`.
- **Passwordless auth** — simpler UX, no password storage/hashing concerns. Codes expire after 10 minutes.
- **Soft delete** — tasks are never truly deleted, enabling future undo/audit features.
- **CSS custom properties for theming** — theme switching is instant with no re-render, and new themes can be added with just CSS.
- **Rate limiting** — auth endpoints are rate-limited (10 req/min per IP) to prevent abuse.

## License

MIT

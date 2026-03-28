# FunctionFlow Frontend

React single-page application for the FunctionFlow task management platform.

## Tech Stack

- **React 19** with TypeScript 5.9
- **Vite 8** for dev server and bundling
- **Tailwind CSS v4** for styling
- **React Router 7** for client-side routing
- **Lucide React** for icons
- **React Hot Toast** for notifications

## Prerequisites

- [Node.js 20+](https://nodejs.org/)
- npm (included with Node.js)

## Getting Started

```bash
# From the frontend/ directory

# Install dependencies
npm install

# Start dev server (port 3000, proxies /api to backend on port 5000)
npm run dev
```

Make sure the backend is running on port 5000 before starting the frontend.

## Building

```bash
npm run build
```

Output goes to `dist/` — a static SPA that can be served by nginx or any static file server.

## Type Checking

```bash
npx tsc --noEmit
```

## Project Structure

```
src/
├── components/      # Reusable UI components
│   ├── Layout.tsx       # App shell (header, nav, theme toggle)
│   ├── TaskCard.tsx     # Task list item with status/priority/tags
│   └── TaskModal.tsx    # Create/edit task form dialog
├── hooks/           # Custom React hooks
│   ├── useAuth.tsx      # Auth context (JWT, demo mode)
│   └── useTheme.tsx     # Theme preference (5 themes)
├── lib/             # Utilities
│   └── api.ts           # REST API client (typed, auto-redirect on 401)
├── pages/           # Route-level components
│   ├── CalendarPage.tsx     # Today/week/month calendar views
│   ├── DashboardPage.tsx    # Main task view (list + swimlane)
│   ├── LoginPage.tsx        # Email code login + demo mode
│   ├── ProfilePage.tsx      # Profile settings + API key management
│   └── VersionPage.tsx      # Health check + version + credits
├── types/           # TypeScript interfaces
│   └── index.ts
├── App.tsx          # Router + route definitions
└── main.tsx         # App entry point
```

## Features

- **Five themes**: Function (terracotta), Dark (indigo), Light (blue), Vaporwave (neon pink), Cyberpunk (cyan)
- **Swimlane view**: Kanban-style board with To Do / In Progress / Done columns
- **List view**: Traditional task list with search, filter, and sort
- **Calendar view**: Month grid with colored dots per list, plus today/week views
- **Task lists**: Sidebar to organize tasks into named lists with emoji
- **Printer-friendly**: `Ctrl+P` renders a clean checklist layout
- **API key management**: Generate and revoke personal API keys
- **Demo mode**: Try the app without creating an account (data deleted on logout)
- **Remember me**: Optional 30-day token on login

# FunctionFlow Roadmap

## Done

1. **Inline TODOs resolved** — Split enums into separate files (`TaskPriority.cs`, `TaskStatus.cs`), created `Theme.cs` enum, added XML documentation to all models.

2. **Ephemeral demo sessions** — Dev login creates a unique user per session (`demo-{guid}@functionflow.local`). Data is destroyed on logout. Frontend shows a warning modal before entering demo mode and an amber banner during the session.

3. **API key authentication** — Users can generate personal API keys (prefixed `ff_`) from the Profile page. Keys are SHA-256 hashed at rest and shown only once on creation. The `X-Api-Key` header is accepted alongside JWT for all authenticated endpoints.

4. **Remember me** — Checkbox on the code verification step. When checked, the JWT token lasts 30 days instead of 7.

5. **All classes/functions/properties documented** — Comprehensive XML documentation on all models, controllers, services, and DTOs.

6. **Swagger API documentation** — Swagger UI available at `/swagger` in development mode with JWT Bearer auth support.

7. **Database interfaces** — `IEmailService` and `ITokenService` interfaces allow swapping implementations. EF Core DbContext is injected via DI.

8. **Multiple lists** — Full CRUD for task lists with `[User] → [Lists] → [Tasks]` hierarchy. Lists have name, emoji, color, and sort order. Deleting a list moves its tasks to the inbox.

9. **Printer-friendly view** — Print stylesheet renders a clean checklist with checkboxes. Print button in the dashboard header. `print:hidden` class hides UI chrome.

10. **Task states** — Tasks have `Todo`, `InProgress`, and `Done` status with one-click cycling and a swimlane/kanban board view.

11. **Due dates** — Tasks support due dates with overdue highlighting in the UI.

12. **Emoji per list** — Each list can have an emoji displayed in the sidebar and task modal list selector.

13. **Today / this week / this month views** — Calendar page with month grid showing colored dots per list, plus today and week views. Clicking a day shows tasks due that day.

14. **Color themes per list** — Lists auto-assign from a 10-color rotation (blue, violet, rose, amber, emerald, cyan, fuchsia, orange, lime, sky). Colors are shown as dots in the calendar view.

15. **Mobile-friendly and desktop** — Responsive layout using Tailwind breakpoints. Sidebar hidden on mobile, filters collapse, cards stack vertically.

16. **Integration tests** — 37 xUnit integration tests covering auth, tasks, lists, API keys, demo sessions, profile, validation, and user isolation. Uses `WebApplicationFactory` with in-memory database.

17. **Notes, URL, and other fields** — Tasks have `notes` (up to 10,000 chars) and `url` (up to 2,048 chars) fields. Shown in the task modal and indicated on task cards with icons.

18. **Toggle completed tasks** — Eye/EyeOff button in the dashboard header to show or hide done tasks.

19. **GitHub CI** — `.github/workflows/ci.yml` with backend build+test, frontend typecheck+build, automatic version bump (patch), and GitHub Release creation on push to main.

20. **No secrets in repo** — JWT key removed from `appsettings.json`. Production requires `Jwt__Key` environment variable; development uses a fallback that throws in non-dev environments.

21. **README badges** — CI status, .NET, React, TypeScript, Tailwind, xUnit, Docker, and License badges on the root README.

22. **Sub-READMEs** — `backend/README.md` and `frontend/README.md` with build, run, test, and configuration instructions. Linked from the root README project structure.

23. **Swimlane view** — Kanban board with three columns (To Do, In Progress, Done) accessible via toggle button in the dashboard.

## Still To Do

1. Theming for Swagger docs to match the website theme.

2. UI tests — Playwright or Cypress end-to-end tests and a test report viewer.

3. Test coverage badge — generate coverage reports in CI and display as a badge.

## Out of Scope

1. Profile picture uploads, file/image attachments on tasks.

2. MCP wrapper for the API.

3. Encrypted at-rest storage for personal info and API keys.

4. Other languages besides English

5. export/import/backup/restore

6. iOS/Android app

7. Rich text editor in the tasks, support for markdown?

8. Shared tasks between users, have a connections list/friends list

9. Additional statuses

10. Additional priorities

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

24. **Port consolidation** — Dev frontend listens on port 80 (`localhost`), API on 4001. Docker maps frontend to 4000, API to 4001. Updated launchSettings, vite.config, docker-compose, and all READMEs.

25. **Demo login in production** — Removed `IsDevelopment()` gate so demo sessions work in Docker/production deployments.

26. **First-time user seeding** — New email users get the same starter lists (Work, Personal, Side Project) and 10 sample tasks as demo accounts. Extracted into shared `SeedStarterDataAsync` method.

27. **Swagger available in all environments** — Swagger UI works in production with a pinhole CSP policy for `/swagger` routes.

28. **Test coverage in CI** — Backend uses `XPlat Code Coverage` with `reportgenerator` summary; frontend uses `@vitest/coverage-v8`. Coverage reports print in CI logs.

29. **Create list from task modal** — "Create new list..." option in the list dropdown opens an inline name input. Works even when no lists exist yet.

30. **Mobile list selector** — Dropdown selector for lists shown on small screens (`md:hidden`), since the desktop sidebar is hidden on mobile.

31. **Frontend tests in CI** — Added `npx vitest run` step to the GitHub Actions frontend job, gating version bumps on test pass.

32. **Input sanitization** — HTML tags stripped from all user-entered text fields (title, description, notes, tags, list name) via `StringSanitizer.Sanitize()` in backend controllers. EF Core parameterized queries prevent SQL injection; React JSX auto-escaping prevents XSS.

33. **Version link on profile** — "Version & Health" link on the Profile page navigates to `/version`.

34. **Example task prefix** — Seed tasks are prefixed with `[EXAMPLE]` so new users know they're sample data.

35. **Collapsible swimlane columns** — Status column headings in swimlane view are tappable on mobile, toggling the column open/closed with ▶/▼ indicators.

36. **Delete confirmation** — Deleting a task now shows a `confirm()` dialog to prevent accidental deletions from mis-clicks.

37. **No scroll jump on status toggle** — Status changes use optimistic local state update instead of a full refetch, so the page doesn't scroll to the top.

38. **Auto-submit 2FA code** — The verification code form auto-submits when all 6 digits are entered (e.g. from paste). No need to click Verify manually.

39. **Emoji picker for inline list creation** — When creating a new list from the task modal, an emoji picker button lets you choose an emoji alongside the name.

40. **Mobile list label** — The mobile list dropdown now has a "Lists" heading label and emoji prefixes for better visibility.

41. **Allow today as due date** — Fixed the `CreateTaskValidator` to use `GreaterThanOrEqualTo(DateTime.UtcNow.Date)` so tasks due today pass validation. Frontend date input now sets `min` to today for new tasks and serializes as noon UTC to avoid timezone issues.

42. **Calendar: new task button + click date to add** — Added a "New Task" button in the calendar header and an "Add Task" button next to the selected date heading. The `TaskModal` receives a `defaultDueDate` prop so the date is pre-filled when creating from the calendar.

43. **Due date sort order (ascending/soonest first)** — Backend due-date sorting now pushes null dates to the end and defaults to ascending order. Frontend sends `sortDir: "asc"` when sorting by due date. Sort option label updated to "Due Date (Soonest)".

44. **Calendar: edit tasks / access notes** — Task cards on the calendar are now clickable to open the edit modal. Action buttons use `stopPropagation` to avoid conflicts. Mobile action buttons are always visible.

45. **Tags: filter by tag on click** — Clicking a tag badge on any task card filters the dashboard to that tag. An active tag badge with a dismiss button appears above the task list.

46. **Calendar dots colored by priority** — Calendar month-view dots are now colored by task priority (red for High, yellow for Medium, green for Low) instead of list color. Dots include a title tooltip with task name and priority.

47. **Custom color scheme editor** — Added a "Custom" theme option to the profile page. When selected, a color picker panel lets users customize all 12 CSS variables. Colors are persisted to localStorage and applied as inline styles. Dark backgrounds are auto-detected for text contrast.

48. **Navigation toggle: calendar ↔ tasks** — The calendar icon in the header now toggles contextually. When on the dashboard, it shows a calendar icon linking to `/calendar`. When on the calendar page, it switches to a tasks icon linking back to `/` ("Back to tasks"). Profile and Logout buttons also received title tooltips.

49. **Tooltips on all icon buttons** — Every icon-only button across the app now has a `title` attribute for hover context: "Back to tasks" / "Calendar", "Profile", "Log out", "Edit task", "Delete task", "Mark in progress" / "Mark done" / "Mark to do", "Filters", "Previous", "Next", "Hide completed" / "Show completed", "Swimlane view" / "List view", and "Print".

50. **Status toggle clarity** — Status toggle icons enlarged from 16px to 20px, vertically centered with `self-center`, and hover scale increased to 125%. Title attributes now show contextual labels per state: "Mark in progress" (Todo), "Mark done" (InProgress), "Mark to do" (Done).

51. **Version page back button** — Added an ArrowLeft "Back" button to the top of the Version & Health page so users can navigate back without relying on the browser back button.

52. **Completed tasks sort to bottom** — Done tasks are now always sorted to the bottom of both the Dashboard and Calendar task lists using a stable client-side sort, preserving the server's sort order for non-completed tasks.

## Still To Do

### Medium Effort

1. **Break up DashboardPage (~720 lines)** — Extract logical sections into sub-components: `TaskFilters`, `TaskFormModal`, `PrintView`. Streamline inline rendering logic.

2. **Shared `useTaskActions` hook** — `DashboardPage` and `CalendarPage` duplicate task CRUD logic (create, update, delete, toggle status). Extract a shared `useTaskActions(onRefresh)` hook to eliminate the duplication.

3. **Add `AbortController` to fetch calls** — Long-running or rapid-fire fetches (e.g. typing in search, switching pages quickly) can cause stale-state bugs. Wire `AbortController` into `useEffect` cleanup for all `api.get`/`api.post` calls that run on mount or on dependency changes.

4. **Split `AuthController` (~200 lines)** — `AuthController.cs` handles login, registration, email verification, token refresh, and guest conversion. Consider splitting into `LoginController`, `RegistrationController`, and `TokenController`.

### Larger Refactors

5. **Audit & update backend NuGet packages** — Run `dotnet list package --outdated` and update where safe. Pay attention to `FluentValidation`, `Microsoft.AspNetCore.*`, and `coverlet.collector`.

6. **Server-side list-scoped task filtering** — Tasks are currently filtered by list on the client after fetching all tasks. Add a `listId` query parameter to `GET /api/tasks` and filter in the SQL query for better performance at scale.

7. **FluentValidation.AspNetCore deprecation** — `FluentValidation.AspNetCore` is deprecated in favour of manual registration via `AddValidatorsFromAssemblyContaining`. Verify the current setup and remove the deprecated package if still referenced.

8. **Swashbuckle → Scalar / built-in OpenAPI** — Swashbuckle is in maintenance mode. .NET 9+ ships built-in OpenAPI support. When upgrading to .NET 9, replace Swashbuckle with the native `Microsoft.AspNetCore.OpenApi` package and optionally Scalar for the UI.

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

11. Account with email already exists when converting a demo account, might be an attack vector to see what people have accounts?

12. Admin panel to check users

13. UI tests — Playwright or Cypress end-to-end tests and a test report viewer.

14. add some limits to the user enterable fields

15. Theming for Swagger docs to match the website theme.

# FunctionFlow – Maintainability TODO

Items identified during codebase review, ordered by priority.

## Medium Effort

### 1. Break up DashboardPage (~720 lines)

Extract logical sections into sub-components:

- `TaskFilters` – search bar, status/priority selectors, tag filter
- `TaskCard` (already exists as a component, but inline rendering logic in the page could be streamlined)
- `TaskFormModal` – the create/edit modal with form state
- `PrintView` – the print-optimised layout

### 2. Shared `useTaskActions` hook

`DashboardPage` and `CalendarPage` duplicate task CRUD logic (create, update, delete, toggle status). Extract a shared `useTaskActions(onRefresh)` hook to eliminate the duplication.

### 3. Add `AbortController` to fetch calls

Long-running or rapid-fire fetches (e.g. typing in search, switching pages quickly) can cause stale-state bugs. Wire `AbortController` into `useEffect` cleanup for all `api.get`/`api.post` calls that run on mount or on dependency changes.

### 4. Split `AuthController` (~200 lines)

`AuthController.cs` handles login, registration, email verification, token refresh, and guest conversion. Consider splitting into:

- `LoginController` – passwordless login flow
- `RegistrationController` – guest/email registration + conversion
- `TokenController` – refresh/revoke

## Larger Refactors

### 5. Audit & update backend NuGet packages

Several packages may be behind their latest stable versions. Run `dotnet list package --outdated` and update where safe. Pay attention to:

- `FluentValidation` major version
- `Microsoft.AspNetCore.*` packages
- `coverlet.collector`

### 6. Server-side list-scoped task filtering

Tasks are currently filtered by list on the client after fetching all tasks. Add a `listId` query parameter to `GET /api/tasks` and filter in the SQL query for better performance at scale.

### 7. FluentValidation.AspNetCore deprecation

`FluentValidation.AspNetCore` is deprecated in favour of manual registration via `AddValidatorsFromAssemblyContaining`. Verify the current setup and remove the deprecated package if still referenced.

### 8. Swashbuckle → Scalar / built-in OpenAPI

Swashbuckle is in maintenance mode. .NET 9+ ships built-in OpenAPI support. When upgrading to .NET 9, replace Swashbuckle with the native `Microsoft.AspNetCore.OpenApi` package and optionally Scalar for the UI.

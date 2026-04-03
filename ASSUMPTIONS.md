# Assumptions, Trade-offs & Next Steps

## Assumptions

- **SQLite over EF Core in-memory** — The requirements offered SQLite or EF Core in-memory. I chose SQLite so data persists across restarts, migrations are real, and reviewers can inspect the database file. In-memory would be simpler but non-reproducible and lost on every restart. EF Core's in-memory provider is used only in the test suite for fast, isolated integration tests.
- **Production MVP scope** — The requirements asked to "add any features you feel are required for a Production MVP." I interpreted this as authentication, input validation, error handling, and a polished UI — not a full SaaS platform. Features like multi-tenancy, rich text, and file uploads were deferred.
- **Passwordless auth is sufficient** — Users authenticate via emailed 6-digit codes rather than passwords. This eliminates password storage, hashing, and reset flows, but assumes users have reliable access to their email. In development, codes log to the console so no SMTP setup is needed.
- **Demo sessions are ephemeral** — Each demo login creates a throwaway user with seeded data. Everything is destroyed on logout. This keeps the database clean and lets reviewers explore the app without setting up email.
- **Soft delete over hard delete** — Tasks are soft-deleted rather than removed from the database. This supports future undo/audit features and accepts the trade-off of slightly larger storage over time.
- **Client-side list filtering is acceptable at current scale** — Tasks are fetched globally and filtered by list on the frontend. This works fine for personal task volumes but would need server-side filtering for larger datasets.
- **English only** — All UI strings and validation messages are hardcoded in English. Internationalization was deferred as out of scope.

## Trade-offs

| Decision                                   | Benefit                                                             | Cost                                                          |
| ------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| **SQLite over EF Core in-memory**          | Data persists across restarts, real migrations, inspectable DB file | Slightly more setup than in-memory; single-writer constraint  |
| **Passwordless email auth**                | No password storage/hashing, simpler UX                             | Depends on email delivery; codes expire in 10 min             |
| **JWT + API key dual auth**                | Browser sessions get JWT convenience; scripts get API keys          | Two auth paths to maintain and test                           |
| **FluentValidation over Data Annotations** | Expressive rules, centralized constants, easy to test               | Extra dependency, validators must be manually wired           |
| **TanStack Query over manual fetch**       | Built-in caching, invalidation, retry, loading states               | Learning curve, additional bundle size                        |
| **CSS custom properties for theming**      | Instant theme switching, no re-render, easy to extend               | Limited to what CSS variables can express                     |
| **Ephemeral demo accounts**                | Clean database, no orphan data, safe to explore                     | Demo users lose everything on logout — no save/resume         |
| **Soft delete**                            | Future undo/audit capability, data recovery                         | Query filter complexity, storage never truly freed            |
| **Global error handler middleware**        | Consistent JSON error responses, one place to log                   | Exceptions used for control flow in some edge cases           |
| **Optimistic UI updates (status toggle)**  | No scroll jump, instant feedback                                    | Possible brief inconsistency if the server rejects the change |

## Next Steps (Given More Time)

### Architecture & Code Quality

- **Break up large page components** — Extract logical sections into focused sub-components and streamline inline rendering logic.
- **Split large controllers** — Separate concerns like login, registration, and token refresh into distinct controllers for better cohesion.
- **Add request cancellation to fetch calls** — Wire cancellation into component cleanup to prevent stale-state bugs from rapid navigation or typing.
- **Server-side list-scoped filtering** — Filter tasks by list in the database query rather than on the client, for better performance at scale.

### Dependency Maintenance

- **Audit backend packages** — Review outdated dependencies and update where safe.
- **Replace deprecated validation integration package** — Migrate to the currently recommended registration approach.
- **Migrate to built-in OpenAPI** — The current Swagger library is in maintenance mode. When upgrading the framework, replace it with the native OpenAPI support.

### Features Considered but Deferred

- Profile picture uploads & file/image attachments on tasks
- MCP wrapper for the API
- Encrypted at-rest storage for personal info and API keys
- Internationalization (i18n)
- Export / import / backup / restore
- iOS / Android native app
- Rich text / markdown support in task notes
- Shared tasks between users (connections / friends list)
- Additional task statuses beyond Todo / InProgress / Done

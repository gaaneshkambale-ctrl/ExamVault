# ExamVault

[![CI](https://github.com/gaaneshkambale-ctrl/ExamVault/actions/workflows/ci.yml/badge.svg)](https://github.com/gaaneshkambale-ctrl/ExamVault/actions/workflows/ci.yml)

Smart Online Examination System — React + TypeScript frontend, ASP.NET Core (.NET 8)
microservices backend, SQL Server, RabbitMQ / Azure Service Bus, AI-assisted
question generation.

## Project Structure

```
ExamVault
├── Frontend
│   └── examvault-web              React + TypeScript + Vite
├── Backend
│   ├── Gateway
│   │   └── OnlineExamSystem.ApiGateway   YARP
│   ├── Services
│   │   ├── UserService
│   │   ├── ExamService
│   │   ├── QuestionService
│   │   ├── SubmissionService
│   │   ├── ResultService
│   │   ├── NotificationService
│   │   └── AIService
│   └── Shared
│       ├── OnlineExamSystem.Shared.Contracts
│       ├── OnlineExamSystem.Shared.Events
│       └── OnlineExamSystem.Shared.Common
├── Tests
├── Docker
├── Documentation
└── ExamVault.sln
```

## Required Tools

- .NET 8 SDK
- Node.js LTS + npm
- Git
- SQL Server / SQL Server tooling
- Docker (for local RabbitMQ, as of Phase 4)

## Getting Started

### Local Ports / URLs

| App                     | HTTP                    | HTTPS                    |
|--------------------------|--------------------------|----------------------------|
| React (Vite)              | http://localhost:5173  | —                          |
| Gateway (ApiGateway)       | http://localhost:5000  | https://localhost:7000     |
| User API                  | http://localhost:5010  | https://localhost:7010 (Swagger UI at `/swagger`) |
| Exam API                  | http://localhost:5020  | https://localhost:7020 (Swagger UI at `/swagger`) |

As of Phase 2, all frontend calls go through the Gateway only — it proxies
`/api/users/**` and (as of Phase 5) `/api/exams/**` to their respective
services. The frontend never calls User API or Exam API directly.

### Backend

```
dotnet restore
dotnet build
dotnet ef database update --project Backend/Services/UserService/OnlineExamSystem.User.Infrastructure --startup-project Backend/Services/UserService/OnlineExamSystem.User.API
dotnet ef database update --project Backend/Services/ExamService/OnlineExamSystem.Exam.Infrastructure --startup-project Backend/Services/ExamService/OnlineExamSystem.Exam.API
docker run -d --name examvault-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
dotnet run --project Backend/Services/UserService/OnlineExamSystem.User.API
dotnet run --project Backend/Services/ExamService/OnlineExamSystem.Exam.API
dotnet run --project Backend/Gateway/OnlineExamSystem.ApiGateway
dotnet run --project Backend/Services/NotificationService/OnlineExamSystem.NotificationService.Worker
```

RabbitMQ must be running before `User.API` starts — `RegisterUserHandler`
publishes `UserRegisteredEvent` synchronously as part of registration, so
registration fails if RabbitMQ is unreachable. Management UI:
http://localhost:15672 (guest/guest — RabbitMQ's default local-only
credential, not a real secret, same reasoning as the Windows Auth SQL
connection string).

Backend secrets (connection strings, JWT signing keys, etc.) go in .NET User
Secrets, never in `appsettings.Development.json`. The JWT signing key is
required for both `User.API` and `Exam.API` to start, and must be the
**same value** in both (`Exam.API` validates tokens issued by `User.API`,
sharing the config value, not any code):

```
cd Backend/Services/UserService/OnlineExamSystem.User.API
dotnet user-secrets set "Jwt:SigningKey" "<a long random string>"
cd ../../ExamService/OnlineExamSystem.Exam.API
dotnet user-secrets set "Jwt:SigningKey" "<the same long random string>"
```

Exam Service endpoints are Admin-only. A freshly registered user is always
`Student`; to test them locally, promote a user to `Admin` directly in
`ExamVault.UserDb` (`UPDATE Users SET Role = 1 WHERE Email = '...'`) and
log in again to get a token with the `Admin` role claim.

### Frontend

```
cd Frontend/examvault-web
npm install
cp .env.example .env.local   # optional: override VITE_API_BASE_URL locally
npm run dev
```

`.env.development` holds the non-secret local default (API base URL only).
`.env.local` (gitignored) can override it per machine if needed.

## Development Roadmap

See `ActionPlan.txt` for the full day-by-day execution plan (Phase 0 → Phase 10),
and `Readmap.txt` / `ExamVault_Day_By_Day_Implementation_Hierarchy.docx` /
`ExamVault_Daily_Frontend_Backend_Parallel_Roadmap.docx` for the source roadmaps.
UI reference: `wireframe.png` (12-screen overview) and `Adminwireframe.png`
(10 detailed admin-side screens, spanning Phase 5/6/AI Milestone).

## Phase 0 Progress

- [x] Day 1 — Repository and tooling setup
- [x] Day 2 — .NET solution skeleton
- [x] Day 3 — React frontend
- [x] Day 4 — Configuration and local ports
- [x] Day 5 — Phase 0 gate

### Phase 0 Completion Checklist

- [x] Solution structure matches the target architecture (Frontend / Backend
      Gateway+Services+Shared / Tests / Docker / Documentation)
- [x] React frontend is completely separate from the .NET projects (no
      cross-references either direction)
- [x] Gateway has no direct service database dependency (no packages, no
      project references at all yet — YARP added in Phase 2)
- [x] Backend project reference graph is a clean DAG, no circular references
      (Shared.Common → Domain/Contracts/Events → Application → Infrastructure → API)
- [x] Startup instructions documented in this README (Local Ports/URLs, Backend, Frontend sections above)
- [x] `dotnet build` passes (0 warnings, 0 errors)
- [x] `npm run build` passes
- [x] All three apps (React, Gateway, User API) start and respond over HTTP

**Phase 0 is signed off. Phase 1 (User Service MVP) is unlocked.**

## Phase 1 Progress

- [x] Day 6 — User Service foundation
- [x] Day 7 — Registration API
- [x] Day 8 — Profile and User APIs
- [x] Day 9 — User Service gate

### Day 6 Notes

- `AppUser` entity in `User.Domain` (named `AppUser`, not `User`, to avoid a
  namespace collision with the `OnlineExamSystem.User.*` root namespace)
- `UserDbContext` in `User.Infrastructure`, EF Core 8 + SQL Server provider
- `IUserRepository` abstraction in `User.Application`, `UserRepository`
  implementation in `User.Infrastructure`
- Connection string (`ConnectionStrings:UserDb`) uses local `MSSQLSERVER`
  with Windows Auth — not a secret, so it lives in `appsettings.Development.json`
- Initial migration applied: `ExamVault.UserDb` database created, `Users`
  table verified via `sqlcmd`

### Day 7 Notes

- `RegisterUserCommand`/`RegisterUserValidator` (FluentValidation)/
  `RegisterUserHandler` in `User.Application`, `RegisterUserRequest`/
  `RegisterUserResponse` contracts in `Shared.Contracts`
- Password hashing via `PasswordHasher<AppUser>` (Microsoft.Extensions.Identity.Core)
- `POST /api/users/register` on `UsersController` — 201 on success, 409 on
  duplicate email, 400 with field errors on validation failure
- Added dev-only CORS policy on User API so the React dev server
  (`localhost:5173`) can call it directly until the Gateway is wired up in Phase 2
- Unit tests: `Tests/UserService/OnlineExamSystem.User.Application.Tests`
  (validator + handler, 10 tests, using an in-memory fake repository)
- CI now runs these tests for real (`continue-on-error` removed from the
  workflow's test step now that real tests exist)
- Register page redesigned to match `wireframe.png`: two-panel layout
  (`AuthLayout`, reusable for Login later) with indigo brand panel, client-side
  validation, loading/error/success states, wired to the live API
- Verified end-to-end in the browser: successful registration, duplicate-email
  conflict, and validation-error paths all render and persist correctly

### Day 8 Notes

- `GetUserProfileQuery`/`GetUserProfileHandler` in `User.Application`,
  `UserProfileResponse` contract in `Shared.Contracts`
- `GET /api/users/{id}` on `UsersController` — 200 with profile, 404 if not
  found. Unauthenticated/stubbed foundation for now: takes the user id as a
  route parameter since there's no session yet; Phase 3 replaces this with a
  real `GET /api/users/me` derived from the JWT
- `RegisterUserResponse`'s `Location` header now correctly points at the new
  `GetById` action (was pointing at `Register` itself)
- Unit tests added for the handler (found/not-found), 12 tests total now
- Frontend: `Profile` page at `/profile/:id`, fetched via TanStack Query
  (`getUserProfile` in `userApi.ts`)
- Rebuilt Profile to match `wireframe.png`'s actual Profile page: dark
  `DashboardSidebar` (Dashboard/My Exams/My Results/Profile, Profile
  highlighted — the other items are placeholders, not built yet) + card with
  avatar initial, Change Photo button, Full Name/Email/Role, Update Profile
  button (both buttons are visual-only for now, no backend for them yet)
- Register's success screen now links to the new profile
- Verified end-to-end in the browser: register → "view your profile" →
  real data renders on the Profile page

### Day 9 Notes

- Added `ILogger<UsersController>` logging: register success, register
  conflict, register validation failure, profile-not-found — verified all
  four lines appear in the console during manual testing
- Verified the full flow end-to-end against the running API: register
  (201 + `Location` header), duplicate email (409), invalid payload (400
  with field errors), profile lookup (200), unknown id (404) — an EF Core
  insert confirmed the row was written to the `Users` table
- Documented both endpoints' request/response shapes per status code in
  `Documentation/api-contracts.md`
- Register form inputs now have proper `autoComplete` attributes
  (name/email/new-password) for browser autofill and password managers
- Rebuilt the Profile page to match `wireframe.png` item 10 more closely:
  page heading above the card, avatar + "Change Photo" as a left column,
  Full Name/Email/Role as horizontal label/value rows (Bootstrap
  `Form.Control readOnly`) in a right column, "Update Profile" bottom-right.
  New `ProfileAvatarIllustration` component replaces the initials circle,
  matching the flat-shape illustration style used on Login/Register.
  No `Phone` field yet — `UserProfileResponse` doesn't return one.
- Added frontend test infra: Vitest + React Testing Library (`npm run
  test`), jsdom environment
- CI note (found after this day, fixed post-Phase-3): the Frontend CI job
  failed with `[vitest-pool]: Failed to start forks worker` / `Timeout
  waiting for worker to respond`, no matter which pool/parallelism setting
  was tried. The real error, buried under that generic timeout, was
  `TypeError: webidl.util.markAsUncloneable is not a function` — jsdom 30
  pulls in `undici` 8.0.3+, which calls
  `node:worker_threads.markAsUncloneable`, a function Node only added in
  v21.0.0. CI's workflow pinned Node 20. Fixed by bumping
  `.github/workflows/ci.yml`'s `node-version` to `'22'` — no application
  code was ever at fault
- Extracted Register's inline `validate()` into `src/utils/validation.ts`
  so it's unit-testable; added `validation.test.ts` (9 cases) and
  `Register.test.tsx` (empty-form and password-mismatch cases) — 12
  frontend tests total, all passing
- Full verification green: `dotnet build`, `dotnet test` (12/12),
  `npm run build`, `npm run lint`, `npm run test` (12/12)

**Phase 1 (User Service MVP) is complete. Phase 2 (YARP Gateway) is unlocked.**

### Out-of-order: basic Login

Before starting Phase 2, a basic (non-JWT) login was added since the Login
page had been visual-only since Day 3: `POST /api/users/login`
(`LoginUserCommand`/`Handler`/`Validator` in `User.Application`, mirroring
the Register pattern) verifies email+password against the `Users` table and
returns the same `UserProfileResponse` shape as the profile endpoint. Both
unknown-email and wrong-password return the same generic 401 to avoid user
enumeration. The Login page calls it and navigates to `/profile/:id` on
success. This is not the Phase 3 JWT/session work — no token, no persisted
session, no protected routes yet; Phase 3 replaces this properly.

## Phase 2 Progress

- [x] Day 10 — API Gateway setup
- [x] Day 11 — Frontend cutover and Gateway gate

### Day 10 Notes

- Added `Yarp.ReverseProxy` to `OnlineExamSystem.ApiGateway` via
  `dotnet add package` (resolved to 2.3.0)
- `appsettings.json` `ReverseProxy` section: one route/cluster forwarding
  `/api/users/{**catch-all}` to the User API (`http://localhost:5010`)
- `Program.cs`: `AddReverseProxy().LoadFromConfig(...)`, `MapReverseProxy()`
- Moved the dev-only `FrontendDev` CORS policy from User API to the Gateway
  — the browser now only ever talks to the Gateway
- Route has a `RequestHeaderOriginalHost` transform: without it, `Location`
  headers built by `CreatedAtAction` on the backend (e.g. after register)
  leaked the backend's real address (`:5010`) instead of the Gateway's
  (`:5000`) — found and fixed during verification
- Verified via curl directly against the Gateway: register (201, correct
  `Location: http://localhost:5000/...`), duplicate (409), profile (200),
  unknown id (404), login (200/401) — all identical to calling User API
  directly

### Day 11 Notes

- `VITE_API_BASE_URL` now points at the Gateway (`http://localhost:5000`)
  in `.env.development` and `.env.example`; no frontend code changes needed
  (`axiosClient.ts` already reads the env var, `userApi.ts` already uses
  relative paths)
- Removed the now-stale `FrontendDev` CORS policy from User API's
  `Program.cs`
- Verified end-to-end in the browser through the Gateway: Login →
  `/api/users/login` (`:5000`) → redirected to Profile →
  `/api/users/{id}` (`:5000`), confirmed via the browser's network log that
  requests hit `:5000`, never `:5010`
- `npm run build`, `npm run lint`, `npm run test` (12/12) all green after
  the cutover

**Phase 2 (API Gateway) is complete. Phase 3 (JWT Authentication) is unlocked.**

## Phase 3 Progress

- [x] Day 12 — JWT issuing and refresh token storage
- [x] Day 13 — Refresh, logout, and `GET /api/users/me`
- [x] Day 14 — Frontend auth state
- [x] Day 15 — Protected routes and gate

### Day 12 Notes

- Added `Microsoft.AspNetCore.Authentication.JwtBearer` to `User.API` and
  `System.IdentityModel.Tokens.Jwt` to `User.Infrastructure`
- Non-secret `Jwt` settings (Issuer/Audience/token lifetimes) in
  `appsettings.Development.json`; signing key via
  `dotnet user-secrets set "Jwt:SigningKey" ...` (never in appsettings)
- New `RefreshToken` entity (`UserId`, `TokenHash` — SHA-256 of the raw
  token, never the raw value — `ExpiresAtUtc`, `RevokedAtUtc`), wired into
  `UserDbContext`, migration `AddRefreshTokens`
- New `IJwtTokenService`/`JwtTokenService` (access token generation, opaque
  refresh token generation, hashing) and matching `IUserRepository`
  methods
- `LoginUserHandler` now issues + persists a refresh token and returns both
  tokens alongside the profile (new `LoginResponse` contract)

### Day 13 Notes

- Added `POST /api/users/refresh-token`: hash lookup, checks not
  expired/revoked, rotates (revoke old, issue+persist new) — reusing an
  already-rotated token fails the same way as an unknown one (401)
- Added `POST /api/users/logout`: revokes the presented refresh token, 204
  regardless of whether it was already invalid
- Added `GET /api/users/me` (`[Authorize]`, reads the user id from the
  JWT's claims) and removed `GET /api/users/{id}` — the exact swap the Day
  8 code comment had called out for Phase 3
- Wired `AddAuthentication`/`AddJwtBearer`/`UseAuthentication` in
  `Program.cs`
- 7 new unit tests (login now returns tokens; refresh valid/reused/expired/
  revoked/unknown; logout) — 23 backend tests total, all passing
- Verified via curl through the Gateway: login issues real tokens, `/me`
  200 with a valid token / 401 without, refresh rotates (old token then
  fails), logout revokes (subsequent refresh fails) — found and fixed a bug
  during this pass: the `AddRefreshTokens` migration had been generated but
  never applied to the database (`dotnet ef database update`)

### Day 14 Notes

- Added `AuthContext`/`AuthProvider` (`src/context/`) and a `useAuth` hook
  (`src/hooks/`) — first real use of those placeholder folders. Access
  token lives in memory only; refresh token in `localStorage`
  (`examvault.refreshToken`) — the confirmed tradeoff vs. an HttpOnly
  cookie, out of scope for this phase
- Silent-refresh-on-mount: if a refresh token exists in `localStorage` on
  app load, `AuthProvider` calls `/api/users/refresh-token` then
  `/api/users/me` to restore the session without forcing a re-login
- `axiosClient.ts`: request interceptor attaches
  `Authorization: Bearer <token>`; response interceptor retries once on a
  401 after a silent refresh, and calls an auth-failure handler (clears
  React state) if that also fails
- `Login.tsx` now calls the context's `login()` and navigates to `/profile`
  (no id); `Register.tsx`'s success screen links to `/login` instead of
  `/profile/:id` (Register still issues no tokens — confirmed decision)

### Day 15 Notes

- Added `ProtectedRoute` (redirects to `/login` when not authenticated;
  accepts an optional `roles` prop for when a role-gated page exists —
  none do yet)
- `/profile/:id` → `/profile` (no param), wrapped in `ProtectedRoute`,
  reading the current user from `AuthContext` instead of a route param
- Added a Logout button on the Profile page; found during verification
  that `ProtectedRoute`'s own guard already redirects to `/login` the
  instant `logout()` clears the user (it wins the race against an
  explicit `navigate('/')`), so the explicit navigate was removed as
  redundant
- Verified end-to-end in the browser: register → redirected to login → log
  in → lands on `/profile` with real data → reload the page and the
  session survives via silent refresh → logout → `/profile` now redirects
  to `/login`
- Full verification green: `dotnet build`, `dotnet test` (23/23),
  `npm run build`, `npm run lint`, `npm run test` (12/12)

**Phase 3 (JWT Authentication) is complete. Phase 4 (RabbitMQ / Azure Service Bus) is unlocked.**

## Phase 4 Progress

- [x] Day 16 — Event contracts
- [x] Day 17 — RabbitMQ local
- [x] Day 18 — Production messaging foundation and gate

### Day 16 Notes

- Added `IntegrationEvent` (`Base/`) — shared base convention (`EventId`,
  `OccurredAtUtc`) every future event inherits
- Added `UserRegisteredEvent` (`User/`) — `UserId`, `Email`, `FullName`
- Added `IEventPublisher` (`Publishing/`) — `PublishAsync<TEvent>` where
  `TEvent : IntegrationEvent`
- Contracts only — no RabbitMQ package referenced yet, `RegisterUserHandler`
  untouched
- `dotnet build` and `dotnet test` (23/23) both green

### Day 17 Notes

- Added `RabbitMQ.Client` (7.2.2) to `User.Infrastructure`; new
  `RabbitMqSettings` (non-secret, `appsettings.Development.json`) and
  `RabbitMqEventPublisher` implementing `IEventPublisher` — one long-lived
  `IConnection` (singleton), a short-lived `IChannel` per publish, a durable
  fanout exchange (`examvault.events`), message `Type` property set to the
  event's class name for the consumer to key off
  `RegisterUserHandler` now takes `IEventPublisher` and publishes
  `UserRegisteredEvent` after a successful save; registered as
  `AddSingleton<IEventPublisher, RabbitMqEventPublisher>` in `Program.cs`
- New minimal `OnlineExamSystem.NotificationService.Worker` project
  (`Backend/Services/NotificationService/`) — a `BackgroundService` that
  declares/binds a queue to the fanout exchange and logs any
  `UserRegisteredEvent` it receives. This is only the Day 17 foundation, not
  the full Phase 9 Notification Service
- New `FakeEventPublisher` test double + a test asserting registration
  publishes the event with the right `UserId`/`Email`/`FullName` — 24/24
  backend tests green
- Verified end-to-end: `docker run rabbitmq:3-management` → started the
  Worker → registered a user via `curl` through `User.API` → Worker logged
  `UserRegisteredEvent received: UserId=..., Email=..., FullName=...`
  matching the registration response
- Known tradeoff, intentionally deferred to Day 18: registration now fails
  if RabbitMQ is unreachable (no retry/circuit-breaker yet) — that hardening
  is explicitly Day 18's job, not Day 17's

### Day 18 Notes

- Added `Documentation/messaging-design.md`: retry/DLQ design (outbox
  pattern vs. retry-with-backoff on the publish side; manual ack + DLQ on
  the consume side — none implemented, design notes only, per the plan),
  idempotency (`EventId`-based dedup — at-least-once delivery, harmless
  today since the consumer only logs, load-bearing once Phase 9 adds real
  side effects), and the Azure Service Bus boundary (`IEventPublisher` is
  the swap point; consumer side has no abstraction yet — not worth adding
  until Phase 9 has more than one consumer to generalize from)
- Re-verified the Day 17 flow end-to-end with no code changes: RabbitMQ up
  → Worker started → registered a user via `curl` → Worker logged the
  matching `UserRegisteredEvent` — no regressions
- `dotnet build`/`dotnet test` (24/24) green in Release config, matching CI

**Phase 4 (RabbitMQ / Azure Service Bus foundation) is complete. Phase 5 (Exam Service) is unlocked.**

## Phase 5 Progress

- [x] Day 19 — Exam service skeleton and Admin Dashboard shell
- [x] Day 20 — Exam persistence and Create Exam
- [x] Day 21 — Exam APIs and live exam list
- [x] Day 22 — Edit, settings, publish, and gate

### Day 19 Notes

- New `OnlineExamSystem.Exam.API`/`.Application`/`.Domain`/`.Infrastructure`
  projects (`Backend/Services/ExamService/`), mirroring UserService's
  layout and project-reference rules, added to `ExamVault.sln`
- New `ExamPaper` entity (`Exam.Domain/Entities/`) — named `ExamPaper`, not
  `Exam`, for the same reason the User service's entity is `AppUser` not
  `User`: a class named `Exam` inside the `OnlineExamSystem.Exam.*`
  namespace tree collides with the namespace segment itself. Basic
  Information fields
  (Title, Description, ExamType, DurationMinutes, TotalMarks,
  PassingMarks, Instructions, Status, TotalQuestions, CreatedByUserId)
  plus the Exam Settings fields from `Adminwireframe.png` screen 9
  (ShuffleQuestions, ShuffleOptions, ShowResult, ShowCorrectAnswers,
  AllowReview, StartAtUtc/EndAtUtc, MaxAttempts, NegativeMarkingEnabled,
  NegativeMarks) — no DbContext/migration/endpoints yet, that's Day 20/21
- `TotalQuestions` is exam-level metadata the admin will enter at
  creation, not a live count of real `Question` rows — Question Service
  doesn't exist until Phase 6
- New `AdminSidebar`/`AdminLayout` (distinct from the student-facing
  `DashboardSidebar` used by Profile) — sidebar nav matches
  `Adminwireframe.png`; only Dashboard and Exams are real links, the rest
  render as non-clickable placeholders for later phases
- New `/admin/dashboard` (stat cards, all zero — no stats endpoint exists
  yet, intentionally not fabricated) and `/admin/exams` (static mock rows
  matching the wireframe's table columns; Create/View/Delete actions
  disabled — wired to real data starting Day 21), both behind
  `ProtectedRoute` (no role restriction yet — that's Day 22)
- `dotnet build` (backend, including the 4 new projects) and
  `npm run build`/`lint`/`test` (12/12) all green
- Not verified visually in a real browser this session — the Chrome
  extension wasn't connected. Confirmed instead via a clean TypeScript
  build, lint, full test suite, and the Vite dev server returning 200 for
  both new routes; an actual visual check is still worth doing before
  Day 20 builds on top of this shell

### Day 20 Notes

- New `ExamDbContext` (`Exam.Infrastructure/Persistence/`), SQL Server
  (local MSSQLSERVER, Windows Auth, `ExamVault.ExamDb` — Exam Service owns
  its own database), migration `InitialCreate`, `IExamRepository`/
  `ExamRepository` (`AddAsync`/`SaveChangesAsync` only — `GetByIdAsync`/
  `GetAllAsync` land Day 21 alongside the endpoints that need them)
- New `CreateExamCommand`/`Validator`/`Handler` (`Exam.Application/Exams/Create/`):
  Title, Description, ExamType, DurationMinutes, TotalMarks, PassingMarks,
  Instructions. Settings fields keep their entity defaults for now — the
  settings-editing UI is Day 22. New exams always start `Status: Draft`
- Plan adjustment, out of necessity: the frontend only ever talks to the
  Gateway (a locked-in principle since Phase 2), so the Create Exam form
  couldn't work without a real endpoint to call. Added `POST /api/exams`
  (`[Authorize(Roles = "Admin")]`, reusing the JWT role claim — applied
  now rather than waiting for Day 21/22, since leaving a write endpoint
  unauthenticated even temporarily isn't worth the risk) plus the Gateway
  route (`/api/exams/{**catch-all}` → `:5020`) and the
  `CreateExamRequest`/`ExamResponse` contracts in `Shared.Contracts`. Day
  21 still owns `GET /api/exams`, `GET /api/exams/{id}`, and full
  API-level test coverage
- `Exam.API` validates JWTs independently (own `Jwt:Issuer`/`Audience`/
  `SigningKey` config, own User Secrets store) — no code sharing with
  `User.API`, just the same signing key value, the normal microservices
  pattern for a service that only validates tokens it doesn't issue
- New `OnlineExamSystem.Exam.Application.Tests` project (`Tests/ExamService/`),
  mirroring UserService's — `FakeExamRepository`, 5 validator tests, 2
  handler tests (mirroring the Day 7 precedent of testing the handler the
  same day it's built, not deferring to Day 21)
- New Create Exam form (`/admin/exams/create`, Basic Information fields
  only, client-side validation in `utils/createExamValidation.ts` + 6
  tests) — the Exams list's "+ Create Exam" button now links here instead
  of being disabled
- Verified end-to-end for real: registered a user through the Gateway,
  promoted it to `Admin` directly in `ExamVault.UserDb`, logged in, and
  `POST /api/exams` with the Admin JWT returned 201 with a Draft exam —
  confirmed the row exists in `ExamVault.ExamDb`. Also confirmed a
  `Student`-role token gets 403 on the same endpoint
- `dotnet build`/`dotnet test` (24 User + 8 Exam = 32/32) and
  `npm run build`/`lint`/`test` (18/18) all green. Chrome extension still
  wasn't connected this session, so the Create Exam form itself wasn't
  visually exercised in a browser — only verified via the API directly
  and the frontend's own build/lint/test/type-check

### Day 21 Notes

- Added `GetExamQuery`/`GetExamHandler` and `ListExamsQuery`/
  `ListExamsHandler` (`Exam.Application/Exams/`), and
  `GetByIdAsync`/`GetAllAsync` on `IExamRepository`/`ExamRepository`
  (`GetAllAsync` orders newest-first by `CreatedAtUtc`) — the two methods
  deliberately deferred from Day 20
- Added `GET /api/exams` and `GET /api/exams/{id}` to `ExamsController`
  (same `[Authorize(Roles = "Admin")]` as `POST`); factored the
  `ExamPaper` → `ExamResponse` mapping into one `ToResponse` helper used
  by all three actions instead of repeating the 11-arg constructor call
- New `useExams()`/`useExam(id)` hooks (`hooks/useExams.ts`) — the first
  real use of TanStack Query in this codebase (the provider has existed
  since Day 3, unused until now)
- `ManageExams` now fetches real data instead of Day 19's mock rows, with
  loading/error/empty states; the list's "View" action links to a new
  view-only `ExamDetails` page (`/admin/exams/:id`); "Delete" stays
  disabled — there's no `DELETE` endpoint, that's not in this phase's
  scope
- Plan adjustment: the plan's Day 21 line called for "unit tests for the
  CreateExam validator/handler" — those were already written Day 20
  (mirroring the Day 7 precedent of testing a handler the day it's
  built). Added 4 new unit tests for `GetExamHandler`/`ListExamsHandler`
  instead. No `WebApplicationFactory`-style API-level test harness exists
  anywhere in this codebase (User Service's endpoints were never covered
  that way either — verification has consistently been manual/`curl`,
  captured in these notes), so continued that pattern rather than
  introducing new test infrastructure ad hoc
- Verified end-to-end for real, through the Gateway with a real Admin
  JWT: `GET /api/exams` returned both exams newest-first, `GET /api/exams/{id}`
  returned the right one, an unknown id returned 404, and a
  `Student`-role token got 403 on both endpoints
- `dotnet build`/`dotnet test` (24 User + 12 Exam = 36/36) and
  `npm run build`/`lint`/`test` (18/18) all green. Chrome extension still
  not connected — same caveat as Days 19-20, verified via direct API
  calls and the frontend's build/lint/test/type-check, not a live browser

### Day 22 Notes

- New `ExamStatusTransitions` (`Exam.Domain/Rules/`) — a pure rule table
  (`Draft <-> Published`, either `-> Archived`, `Archived` terminal). One
  `ChangeExamStatusCommand`/`ChangeExamStatusHandler` handles all three
  transitions (parameterized by target status) rather than three
  near-identical handlers; the controller exposes it as three named
  actions (`POST /api/exams/{id}/publish|unpublish|archive`) so the
  client can only ever request one of those three states, never an
  arbitrary `status` value
- New `UpdateExamCommand`/`Validator`/`Handler` — Basic Information +
  Settings fields (not `status`). `ExamResponse` now also carries the
  Settings fields, added this day since the edit form needs them to
  pre-populate
- `PUT /api/exams/{id}` and the three status-transition endpoints added
  to `ExamsController`, all `[Authorize(Roles = "Admin")]`. A 409 (not
  400) on an invalid transition — it's a legal request that conflicts
  with current state, not a malformed one
- 12 new backend unit tests: `ExamStatusTransitions` (all 4 allowed + 5
  disallowed combinations), `ChangeExamStatusHandler` (valid transition,
  disallowed transition, unknown exam), `UpdateExamValidator` (5 cases
  incl. end-before-start date), `UpdateExamHandler` (3 cases) — 56/56
  backend tests total
- New `EditExam` page (`/admin/exams/:id/edit`): Basic Information +
  a Settings panel (toggles via `Form.Check type="switch"`, start/end
  `datetime-local` inputs, max attempts, negative marking) using
  `useMutation` for save and each status action, invalidating the
  `['exams']` query cache on success so the list/detail refresh. Publish/
  Save as Draft (unpublish)/Archive buttons are conditional on the
  exam's current status — `Archived` shows none, matching the terminal
  rule server-side
- Exams is now the first role-gated section of the UI:
  `/admin/exams`, `/admin/exams/create`, `/admin/exams/:id`, and
  `/admin/exams/:id/edit` all pass `roles={['Admin']}` to `ProtectedRoute`
  (its `roles` prop existed unused since Day 15 — first real use).
  `/admin/dashboard` deliberately stays open to any authenticated user
  for now, per the plan
- Verified end-to-end for real through the Gateway with a real Admin JWT:
  edited an exam's settings (`maxAttempts` 1→2, enabled negative
  marking) → published it → confirmed `Published` in the list → archived
  it → confirmed `Archived` in the list → confirmed publishing an
  already-archived exam returns 409. Also confirmed a `Student` token
  gets 403 on `PUT`, `/publish`, and `/archive`
- `dotnet build`/`dotnet test` (24 User + 32 Exam = 56/56, Release config
  too) and `npm run build`/`lint`/`test` (18/18) all green. Chrome
  extension still not connected — same caveat as Days 19-21, the edit
  page and role-gating weren't visually exercised in a browser, only
  verified via direct API calls and the frontend's own
  build/lint/test/type-check

**Phase 5 (Exam Service) is complete. Phase 6 (Question Service) is unlocked.**

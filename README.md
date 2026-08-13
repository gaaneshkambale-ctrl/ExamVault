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

### Post-Phase-5 fix: role-based login redirect

Found by actually logging in and looking, right after the Chrome
extension still couldn't verify the UI itself: `Login.tsx` unconditionally
navigated to `/profile` after login, regardless of role — a leftover
from Day 14, before any Admin-only route existed. Nothing ever routed an
Admin to `/admin/dashboard`, so the entire Phase 5 Admin UI was
unreachable through the normal login flow even though every API behind
it worked correctly. `login()` (`AuthProvider`/`useAuth`) now returns the
logged-in `UserProfile`, and `Login.tsx` redirects to `/admin/dashboard`
for `Admin` and `/profile` for `Student`.

## Phase 6 Progress

- [x] Day 23 — Question service skeleton and Question Bank shell
- [x] Day 24 — Question persistence and Add Question
- [x] Day 25 — Question APIs and live question list
- [x] Day 26 — Edit, delete, and gate

### Day 23 Notes

- New `OnlineExamSystem.Question.API`/`.Application`/`.Domain`/
  `.Infrastructure` projects (`Backend/Services/QuestionService/`),
  mirroring Exam Service's layout and project-reference rules, added to
  `ExamVault.sln`. Runs on port 5030 (5010 User, 5020 Exam, 5030
  Question)
- New `ExamQuestion`/`QuestionOption` entities (`Question.Domain/Entities/`).
  `ExamQuestion`, not `Question` — same namespace-collision reason `Exam`
  became `ExamPaper`. `QuestionType` enum has all seven wireframe types
  (MultipleChoice, TrueFalse, ShortAnswer, FillInTheBlank,
  MatchTheFollowing, CodeProgram, Essay) — only the first two get real
  support this phase, the rest are reserved so nothing needs revisiting
  later. `QuestionOption` is shared by both supported types (a
  True/False question is just two fixed option rows, not a special
  case) — no DbContext/migration/endpoints yet, that's Days 24-25
- Sidebar's "Questions" link is real now (`/admin/questions`) — a
  non-functional placeholder since Day 19. New `QuestionBank` page shell:
  mock rows matching the wireframe's table columns (Question, Type,
  Exam, Difficulty, Marks, Actions) and type tabs (All/Multiple
  Choice/True-False), tab counts at zero — not fabricated, no real data
  exists yet
- `dotnet build` (backend, including the 4 new projects, 56/56 tests
  unaffected) and `npm run build`/`lint`/`test` (18/18) all green.
  Smoke-tested `Question.API` standalone — boots and Swagger loads at
  `:5030/swagger`. Confirmed via source inspection (not a live browser —
  Chrome extension still not connected) that the sidebar's "Questions"
  item now renders as an actual `<Link>`, not another stale placeholder
  like the Day 22 login bug

### Day 24 Notes

- New `QuestionDbContext` (`Question.Infrastructure/Persistence/`), SQL
  Server (`ExamVault.QuestionDb` — Question Service owns its own
  database), migration `InitialCreate` (`Questions` + `QuestionOptions`
  tables, FK with cascade delete), `IQuestionRepository`/
  `QuestionRepository` (`AddAsync` writes a question and its options
  together in one call — `GetById`/`GetByExamId` land Day 25 alongside
  the endpoints that need them, mirroring Exam Service's split)
- New `CreateQuestionCommand`/`Validator`/`Handler`
  (`Question.Application/Questions/Create/`): only `MultipleChoice`/
  `TrueFalse` accepted; validates exactly one correct option, ≥2 options
  for Multiple Choice, exactly the two fixed True/False options.
  `ExamId` is stored as-is, not validated against a real exam — doing so
  would mean Question Service reaching into Exam Service's data, an
  explicit service-boundary cross this phase doesn't take (same
  reasoning as Day 26's planned `TotalQuestions` non-sync)
- `POST /api/questions` (`[Authorize(Roles = "Admin")]`, applied from the
  start) + the Gateway route (`/api/questions/{**catch-all}` → `:5030`)
  — same necessity as Exam Service's Day 20, the frontend only ever
  calls the Gateway
- New `OnlineExamSystem.Question.Application.Tests` project — 9
  validator tests (both supported types, wrong type, empty text, 0/2
  correct options, too few MC options, wrong True/False text, wrong
  True/False count) + 3 handler tests (create with options, sequential
  `DisplayOrder`, invalid command saves nothing) — 12/12 green
- New Create Question form (`/admin/exams/:examId/questions/create`):
  question type/difficulty selects, question text, marks, a dynamic
  options list for Multiple Choice (add/remove, radio-button correct
  selection) that becomes two fixed True/False rows when that type is
  selected, client-side validation matching the backend rules + 7 tests.
  Reachable via a new "+ Add Question" action on the Exam edit page
- Verified end-to-end for real through the Gateway with a real Admin
  JWT: created a Multiple Choice question (3 options) and a True/False
  question on a real exam, confirmed both plus their options in
  `ExamVault.QuestionDb` (right `OptionCount`/`CorrectCount` per
  question); confirmed two correct options and an unsupported type
  (`Essay`) both 400 with the right messages; confirmed a `Student`
  token gets 403. Also confirmed via source inspection that the new
  "+ Add Question" link compiles to a real `${id}`-interpolated URL, not
  another stale placeholder
- `dotnet build`/`dotnet test` (24 User + 32 Exam + 12 Question = 68/68)
  and `npm run build`/`lint`/`test` (25/25) all green. Chrome extension
  still not connected — same caveat as every day this phase

### Day 25 Notes

- `IQuestionRepository` gained `GetQuestionByIdAsync`/
  `GetOptionsByQuestionIdAsync`/`GetQuestionsByExamIdAsync`/
  `GetOptionsByQuestionIdsAsync` — the four deferred from Day 24. List
  batches all options for the exam's questions in one query (a
  `ToLookup` grouped by `QuestionId`) instead of querying per-question,
  avoiding N+1
- New `GetQuestionQuery`/`Handler` and `ListQuestionsQuery`/`Handler`
  (`Question.Application/Questions/`), sharing a `QuestionWithOptions`
  record between them. Added `GET /api/questions?examId={id}` and
  `GET /api/questions/{id}` to `QuestionsController`, same
  `[Authorize(Roles = "Admin")]` as `POST`
- Scope note: the list endpoint is exam-scoped only (no "all questions
  across every exam" endpoint) — the plan only ever specified
  `GET /api/questions?examId={id}`. This means Day 23's global
  `/admin/questions` Question Bank shell still can't be wired to real
  data and **stays on its Day 23 mock rows** — the live list instead
  became a new "Questions" section on the Exam edit page
  (`EditExam.tsx`), which is exam-scoped by construction and genuinely
  satisfies the Day 25 exit criterion ("Admin can add a question... and
  see it appear in the live question list for that exam")
- New `useQuestions(examId)`/`useQuestion(id)` hooks
  (`hooks/useQuestions.ts`), and a new view-only `QuestionDetails` page
  (`/admin/questions/:id`) showing the question, its options, and which
  one is correct — reachable via a "View" link from the Exam edit
  page's new Questions table
- 4 new backend unit tests (`GetQuestionHandler` x2, `ListQuestionsHandler`
  x2, including a test that a second exam's questions never leak into
  the first exam's list) — 72/72 backend tests total
- Verified end-to-end for real through the Gateway with a real Admin
  JWT: listed both Day 24 questions for the real exam (newest-first,
  correct option counts), fetched one by id, confirmed an unknown id
  404s and an exam with no questions returns `[]` (not 404), confirmed
  a `Student` token gets 403 on both endpoints (one check initially hit
  401 from an expired 15-minute access token, not a bug — resolved with
  a fresh login). Confirmed via source inspection that the new "View"
  link compiles to a real `${question.id}`-interpolated URL
- `dotnet build`/`dotnet test` (24 User + 32 Exam + 16 Question = 72/72)
  and `npm run build`/`lint`/`test` (25/25) all green. Chrome extension
  still not connected — same caveat as every day this phase

### Day 26 Notes

- Small refactor before adding Update: extracted `CreateQuestionOptionInput`
  into a shared `QuestionOptionInput` (`Questions/QuestionOptionInput.cs`),
  used by both Create and Update — avoided Update depending on Create's
  namespace for a type that was never really Create-specific
- New `UpdateQuestionCommand`/`Validator`/`Handler` and
  `DeleteQuestionCommand`/`Handler`. Update replaces the **entire**
  options list rather than diffing (delete old via a bulk
  `ExecuteDeleteAsync`, add the new ones, one `SaveChangesAsync`) — much
  simpler than matching old options to new ones, and correct since
  options have no identity the client would need preserved. Delete just
  removes the `ExamQuestion` row; `QuestionOptions` rows are cleaned up
  by the `ON DELETE CASCADE` FK already configured on Day 23 — verified
  this actually fires (0 orphaned rows) rather than assuming it
- `PUT /api/questions/{id}` and `DELETE /api/questions/{id}` added to
  `QuestionsController`, same `[Authorize(Roles = "Admin")]` as the rest
- 10 new backend unit tests (`UpdateQuestionValidator` x5,
  `UpdateQuestionHandler` x3, `DeleteQuestionHandler` x2) — 82/82 backend
  tests total
- New `EditQuestion` page (`/admin/questions/:id/edit`), pre-populated
  from the fetched question, same form shape as `CreateQuestion` (kept
  as a separate file rather than extracting a shared form component —
  matching the precedent `CreateExam`/`EditExam` already set of not
  sharing form components between create and edit)
- New shared `DeleteQuestionButton` component (a small confirmation
  `Modal` + mutation) used from both the Exam edit page's Questions
  table and the `QuestionDetails` page — the exact same delete flow
  needed in two places, not a premature abstraction
- Small type cleanup: extracted `QuestionFormFields` (the fields
  `CreateQuestionRequest` and `UpdateQuestionRequest` actually share) so
  `validateCreateQuestion` stopped requiring a fake `examId` value just
  to satisfy `CreateQuestionRequest`'s shape when validating an edit
  form that has no `examId` at all
- Verified end-to-end for real through the Gateway with a real Admin
  JWT: updated a question's text/marks/difficulty/options and confirmed
  in `ExamVault.QuestionDb` that the old option row was gone and only
  the two new ones existed; deleted a question, confirmed it vanished
  from the list, confirmed `GET` on it now 404s, and confirmed its
  options were cascade-deleted (0 rows) directly against the database;
  confirmed a `Student` token gets 403 on both `PUT` and `DELETE`, and
  that the question survived the rejected delete attempt. Confirmed via
  source inspection that the new "Edit" link compiles to a real
  interpolated URL and resolves (200)
- `dotnet build`/`dotnet test` (24 User + 32 Exam + 26 Question = 82/82,
  Release config too) and `npm run build`/`lint`/`test` (25/25) all
  green. Chrome extension still not connected — same caveat as every
  day this phase

**Phase 6 (Question Service) is complete. AI Milestone (Days 27-30) is unlocked.**

## AI Milestone Progress

- [x] Day 27 — AI Service skeleton and Generator UI shell
- [x] Day 28 — Real generation and draft preview
- [x] Day 29 — Edit drafts and human approval
- [x] Day 30 — Polish, verification, and gate

### Day 27 Notes

- New `OnlineExamSystem.Ai.API`/`.Application`/`.Domain`/`.Infrastructure`
  projects (`Backend/Services/AiService/`), mirroring Question Service's
  layout, added to `ExamVault.sln`. Runs on port 5040 (5010 User, 5020
  Exam, 5030 Question, 5040 AI). AI Service owns no database — going
  further than the "AI Service never owns the Question DB" principle
  already locked in, it owns no persistence at all
- New `DraftQuestion`/`DraftQuestionOption` in `Ai.Domain` — plain,
  unpersisted value types, no `BaseEntity`/`Shared.Common` dependency
- New `IAiQuestionGenerator` interface + `GenerateQuestionsRequest` shape
  in `Ai.Application` — interface only, no implementation, no
  handler/validator/DI registration yet, matching Question Service's Day
  23 skeleton-only precedent. Concrete provider deliberately deferred to
  Day 28, mirroring how Day 16 defined `IEventPublisher` before Day 17
  wired RabbitMQ
- New AI Generate Questions form (`/admin/exams/:examId/questions/
  ai-generate`) matching Adminwireframe.png screen 5: source toggle (From
  Existing Exam/From Topic-Text enabled, From Document visibly disabled),
  question type chips (Multiple Choice/True-False enabled, Short Answer
  visibly disabled), difficulty checkboxes, instructions textarea.
  Reachable via a new "+ AI Generate" button on the Edit Exam page's
  Questions section. Generate Questions showed an honest "not connected
  yet" notice this day rather than a silent no-op
- `dotnet build` clean (4 new projects), `Ai.API` verified actually
  starting and responding on `:5040`. `npm run build`/`lint`/`test`
  (25/25) all green

### Day 28 Notes

- AI provider: an n8n Chat Trigger webhook (tested directly with curl
  before writing any code — confirmed request/response contract:
  `POST {chatInput, sessionId, action:"sendMessage"}` →
  `{"output": "<json-string>"}`). Concrete `IAiQuestionGenerator`
  implementation is `N8nQuestionGenerator` (`Ai.Infrastructure`) —
  builds a prompt, posts to the webhook, parses the inner JSON string
  (stripping markdown fences defensively) into `DraftQuestion`s,
  matching `answer` against `options` case-insensitively for
  `IsCorrect`. Webhook URL stored via `dotnet user-secrets`, not
  appsettings — possessing the URL alone is enough to invoke the
  workflow (confirmed empirically), so it's treated as a credential
  exactly like the JWT signing key
- Real bug found and fixed while testing: the prompt said "use a mix of
  these question types" even when only one type/difficulty was
  selected, and the model added an unrequested extra type anyway. Fixed
  by switching to "Use ONLY this type — every question must be that
  type" when exactly one is selected; reverified with a direct curl
  call before moving on
- New `GenerateQuestionsHandler`/`Result`/`Validator`
  (`Ai.Application/Generate/`, deferred from Day 27) — question count
  bounded 1-20, types/difficulties validated against the supported
  sets, `Topic` required regardless of source. `POST
  /api/ai/generate-questions` on new `AiController`
  (`[Authorize(Roles = "Admin")]`), provider failures caught and
  returned as a clean HTTP 502 with a generic message — the raw
  exception is only logged server-side, never exposed to the client.
  Gateway route `/api/ai/{**catch-all}` → `:5040` added
- New `aiApi.ts` (`generateQuestions()`) and the Preview screen: 3 stat
  cards (Total/MCQ/True-False, computed client-side from the returned
  drafts), a table of generated questions, working Back/Regenerate.
  View/Edit/Delete-per-row rendered but `disabled` — Day 29's job.
  When source is an existing exam, the frontend derives the AI's topic
  context from `exam.title`/`description` itself rather than AI
  Service calling Exam Service, keeping AI Service dependency-free
- Verified end-to-end through the Gateway with a real Admin JWT, both
  before and after the prompt fix. Exam (34/34) and Question (28/28)
  backend tests unaffected. `npm run build`/`lint`/`test` (25/25) all
  green

### Day 29 Notes

- No new backend endpoints — approval reuses Question Service's
  existing `POST /api/questions` from Day 24 exactly as-is, one call
  per approved draft. This is the human-approval boundary made
  concrete: an AI-suggested question only becomes a real `Question` row
  through the exact same validated path a manually-typed one already
  goes through
- New `DraftEditorModal.tsx` — edits a draft's text, marks, difficulty
  and options (lettered badges + Correct Answer dropdown, matching
  Create/Edit Question's pattern) as its own self-contained copy rather
  than a shared extraction across all three forms — a deliberate choice
  to avoid touching already-shipped, tested Create/EditQuestion
  internals for a "reuse the pattern" ask that was about visual/UX
  consistency, not literal code sharing
- Preview screen gained per-row + select-all checkboxes (defaulting to
  all-selected right after a successful generate/regenerate), working
  Edit (opens the modal, saves back into local state by id) and Delete
  (pure local-state removal, never sent anywhere), and "Add Selected to
  Exam" wired to `Promise.allSettled` over `createQuestion()` calls for
  every selected draft
- Partial-failure handling: on any rejected call, the
  successfully-created drafts are removed from the local list (already
  safely persisted) while failed ones stay behind with an error banner,
  still selected, ready for a retry — only a full-success run
  invalidates the exam's question cache and navigates to its Edit page
- Verified end-to-end by simulating the exact frontend flow via curl:
  generated real drafts for a real exam, approved one with the exact
  payload shape the UI builds, confirmed it round-trips through
  `GET /api/questions?examId=`. `npm run build`/`lint`/`test` (25/25)
  all green; Exam (34/34) and Question (28/28) backend tests unaffected

### Day 30 Notes

- New `OnlineExamSystem.Ai.Application.Tests` project (mirrors
  Question/Exam Application.Tests layout) — `GenerateQuestionsValidator`
  (11 tests: valid Topic/Existing-Exam requests, unsupported source,
  empty/null topic, out-of-bounds count, empty/unsupported question
  types and difficulty levels) and `GenerateQuestionsHandler` (3 tests,
  using a `FakeAiQuestionGenerator`: valid request returns drafts and
  calls the generator once, an invalid request never calls the
  generator at all, a generator exception returns a clean provider
  failure result instead of propagating) — 14/14 new tests, backend
  total now 96/96 (24 User + 34 Exam + 28 Question + 14 AI — Exam and
  Question app-only tests, User total tracked separately in Phase 1)
- Frontend polish: empty-result state on the Preview table ("No
  questions were generated. Try adjusting your inputs and Regenerate.")
  for the edge case where the AI returns zero drafts — the Generator
  form and Preview screen already matched the rest of the admin UI's
  standard (bold labels, brand-indigo heading, outline View/Edit/Delete
  buttons) from Days 27-29, no further styling changes needed
- Full end-to-end re-verification through the Gateway with a real Admin
  JWT, matching the plan's exact scenario: generated 5 questions (Multiple
  Choice + True/False, Medium difficulty) for a real exam, simulated
  editing one draft's correct answer and deselecting another, approved
  the remaining 4 — confirmed exactly those 4 (edit intact) exist in the
  exam's live question list and the deselected one exists nowhere.
  Confirmed a `Student` token gets 403 on `/api/ai/generate-questions`
  and an unauthenticated request gets 401, matching every other
  Admin-only endpoint in the system
- `dotnet build`/`dotnet test` all green across every service. `npm run
  build`/`lint`/`test` (25/25) all green. Chrome extension still not
  connected this entire milestone — every verification pass was a real
  API-level walkthrough through the Gateway with real JWTs, not a
  literal browser click-through; flagged consistently rather than
  silently assumed

## Phase 7 Progress

- [x] Day 31 — Submission Service skeleton and student-side shell
- [x] Day 32 — Attempt persistence, start exam, and answer saving
- [x] Day 33 — Review, submit, auto-submit timer, and gate

### Day 31 Notes

- New `OnlineExamSystem.Submission.API`/`.Application`/`.Domain`/
  `.Infrastructure` projects (`Backend/Services/SubmissionService/`),
  mirroring Question/AI Service's skeleton-day layout, added to
  `ExamVault.sln`. Runs on port 5050 (5010 User, 5020 Exam, 5030
  Question, 5040 AI, 5050 Submission). No DbContext/migration or
  endpoints yet — skeleton only, matching every prior service's first
  day
- New `ExamAttempt` (Id, ExamId, UserId, AttemptNumber, StartedAtUtc,
  SubmittedAtUtc nullable, Status: InProgress/Submitted/AutoSubmitted)
  and `AttemptAnswer` (Id, AttemptId, QuestionId, SelectedOptionId
  nullable, IsMarkedForReview, AnsweredAtUtc) in `Submission.Domain`.
  Entity is `ExamAttempt`, not `Submission`, for the same
  namespace-collision reason `Exam` became `ExamPaper` and `Question`
  became `ExamQuestion`
- Scope gap found and fixed: the plan assumes students can call the
  existing `GET /api/exams`/`GET /api/exams/{id}` to browse Published
  exams, but `ExamsController` was class-level
  `[Authorize(Roles = "Admin")]` from Phase 5, which would 403 every
  student. Loosened the class-level attribute to plain `[Authorize]`
  (any authenticated role) and pushed `[Authorize(Roles = "Admin")]`
  down onto each write action individually (Create/Update/Delete/
  Publish/Unpublish/Archive) so reads are open to any authenticated
  user while mutations stay Admin-only. Reverified: Student token gets
  200 on `GET /api/exams`, 403 on `POST /api/exams`; no token gets 401
- `DashboardSidebar` wired to real routes — Dashboard → `/dashboard`,
  My Exams → `/exams` (My Results stays visibly disabled, same
  "disabled, not hidden" rule as Day 27's Short Answer chip, until
  Phase 8). New `StudentLayout` mirrors `AdminLayout`. Student login
  now lands on `/dashboard` instead of `/profile` (matching Admin's
  existing dashboard-landing pattern); `NavBar`'s account menu updated
  to match
- New Student Dashboard (`/dashboard`, wireframe screen 1): stat chips
  (Upcoming Exams computed from real Published exams; Completed
  Exams/Average Score/Certificates are static zero/placeholder — no
  attempt or result data exists until Phase 8), Upcoming Exams list,
  empty-placeholder Recent Results list, and an empty Performance
  Overview chart reusing `ExamsTrendChart`'s existing empty state
- New My Exams (`/exams`, screen 2): All/Upcoming/Completed/In Progress
  tabs, search, type filter, real Published exams via the now-open
  `GET /api/exams`. Completed/In Progress render empty this day — they
  need attempt data that doesn't exist until Day 32/33
- New Exam Details/Instructions shell (`/exams/:id`, screen 3): exam
  meta card, instructions list mixing real exam data (question/mark
  counts, negative marking) with the fixed "cannot pause/resume, don't
  refresh" warnings from the wireframe scope note, "start only once"
  banner. Start Exam Now shows an honest "not connected yet" notice
  rather than a silent no-op, matching Day 27's AI Generate precedent
- New Take Exam shell (`/exams/:id/take`, screen 4): timer display,
  question-navigator grid with the four-state legend (Answered/Not
  Answered/Marked for Review/Not Visited), single question + options
  panel, working Mark for Review checkbox and Previous/Next
  (client-only state, no real questions or persistence yet — that's
  Day 32), Submit Exam shows the same honest "not connected yet" notice
- Verified end-to-end in a real browser (Chrome extension, not just
  curl): registered a throwaway Student and Admin account, published a
  real exam as Admin, logged in as the Student and confirmed it appears
  on both the Dashboard and My Exams, clicked through to Exam Details
  and Take Exam and exercised the interactive shell elements. Cleaned
  up the throwaway accounts and reverted the exam back to Draft
  afterward. `dotnet build`/`dotnet test` all green (100/100 unaffected
  across User/Exam/Question/AI). `npm run build`/`lint`/`test` (25/25)
  all green

### Day 32 Notes

- New `SubmissionDbContext` (`ExamAttempts`/`AttemptAnswers` tables,
  `ExamVault.SubmissionDb`, unique index on
  `AttemptId`+`QuestionId`, cascade delete from attempt to its
  answers) and `SubmissionRepository`. Initial EF Core migration
  applied
- Scope gap found and fixed: `StartAttemptHandler` needs the exam's
  `MaxAttempts`/`StartAtUtc`/`EndAtUtc` to validate a start request,
  but Submission Service doesn't own that data — no service in this
  codebase had called another service internally before (AI Service's
  HttpClient call is to an external n8n webhook, not a sibling
  service). New `IExamLookupClient` interface (`Submission.Application`)
  + `ExamServiceClient` (`Submission.Infrastructure`) calls Exam
  Service's existing `GET /api/exams/{id}` directly on `:5020`
  (service-to-service, not through the Gateway), forwarding the
  caller's own JWT as the bearer token rather than introducing a
  separate service-account/client-credentials flow — kept minimal
  since the calling student is already authenticated
- `StartAttemptHandler`: returns the existing `InProgress` attempt
  first (accidental-refresh safety net, checked before anything else),
  else validates the scheduling window and `MaxAttempts` (counts all
  prior attempts for that Exam+User) against a fresh Exam Service
  lookup, else creates a new attempt with `AttemptNumber` =
  count + 1. `SaveAnswerHandler`: checks the attempt belongs to the
  calling user (403 if not) and is still `InProgress` (409 if not),
  then upserts one `AttemptAnswer` row per question. New `POST
  /api/submissions/start` and `PUT /api/submissions/{attemptId}/answers`
  on `SubmissionsController`, `[Authorize]` (any role) — the first
  Student-facing write endpoints in the system. Gateway route added
  for `/api/submissions/{**catch-all}` → `:5050`
- Second scope gap found and fixed, this one a real data-leak risk:
  Take Exam needs `GET /api/questions?examId=` for a student, but
  `QuestionsController` was class-level `[Authorize(Roles = "Admin")]`
  since Phase 6 — and its `QuestionOptionResponse` includes
  `IsCorrect`. Simply opening the endpoint to any authenticated role
  (the same fix pattern as Day 31's `ExamsController`) would have let
  any student read every question's correct answer straight out of
  the network response, bypassing the UI entirely. Fixed by also
  masking `IsCorrect` to `false` for non-Admin callers
  (`User.IsInRole("Admin")` gates a new `revealAnswers` parameter on
  the controller's `ToResponse` mapping) — verified directly by
  comparing the same exam's raw JSON response between a Student token
  (all `false`) and an Admin token (real values) before calling this
  done
- New `Submission.Application.Tests` project (`FakeSubmissionRepository`
  + `FakeExamLookupClient`, mirroring the Fake-per-external-dependency
  pattern from AI's tests): 5 `StartAttemptHandler` tests (valid
  request, existing-InProgress-returned-not-duplicated, max attempts
  exceeded, outside window before start, outside window after end) +
  4 `SaveAnswerHandler` tests (valid create, valid update, not
  in-progress, wrong user) — 9/9 new, backend total 109/109
- Frontend: Exam Details' Start Exam Now now calls the real start
  endpoint and navigates to Take Exam with the new attempt's id in
  router state; Take Exam falls back to calling start itself on mount
  if that state is missing (direct navigation/refresh) — safe because
  the endpoint is idempotent, which is exactly what the safety net
  exists for. Take Exam now renders real questions via the existing
  `useQuestions(examId)` hook, applies `ShuffleQuestions`/
  `ShuffleOptions` client-side (first real use of those Phase 5
  fields), and saves every option selection and Mark for Review
  toggle immediately plus again on Previous/Next. The question
  navigator's four states are now driven by real local answer state
  (`selectedOptionId`/`isMarkedForReview`) plus a client-only
  `visited` set — "Not Visited" is deliberately never persisted,
  matching the plan's scope note
- Verified end-to-end in a real browser: registered a throwaway
  Student, published a real exam (11 real questions) as a throwaway
  Admin, clicked Start Exam Now, confirmed a real `InProgress`
  `ExamAttempt` row was created in `ExamVault.SubmissionDb`, answered
  one question and marked a second for review without answering it,
  confirmed both `AttemptAnswer` rows persisted with the right values
  and the navigator showed green/orange/gray correctly. Confirmed via
  curl: calling start twice returns the identical attempt (no
  duplicate row), a Student gets 403 on `POST /api/questions`, editing
  another user's attempt returns 403, and no token gets 401. Cleaned
  up all throwaway accounts/attempts and reverted the exam to Draft
  afterward. `dotnet build`/`dotnet test` 109/109 green; `npm run
  build`/`lint`/`test` (25/25) all green

### Day 33 Notes

- New `SubmitAttemptCommand`/`Validator`/`Handler`: sets
  `Status=Submitted` (or `AutoSubmitted`, per a flag the request
  carries) and `SubmittedAtUtc=now`; rejects an already-submitted
  attempt with 409 and another user's attempt with 403. New
  `GetMyAttemptQuery`/`Handler` (the "mine-lookup"): returns the
  caller's most recent attempt for an exam plus its full list of
  `AttemptAnswer`s in one response (`AttemptWithAnswersResponse`) - the
  answers are what let Take Exam actually restore a resumed attempt's
  state, not just its id. New `POST /api/submissions/{attemptId}/submit`
  and `GET /api/submissions/mine?examId=` on `SubmissionsController`
- Real bug found and fixed while wiring the mine-lookup path: SQL
  Server's `datetime2` columns don't preserve `DateTimeKind`, so EF
  Core reads every `DateTime` back as `Kind=Unspecified`. `StartedAtUtc`
  serialized without a trailing `Z`, and the browser parsed the
  resulting string as local time (IST, UTC+5:30) instead of UTC - a
  freshly-started attempt looked like it had begun 5.5 hours earlier,
  so the countdown timer computed zero time remaining and
  auto-submitted the exam within a second of loading. Caught immediately
  during browser verification, not left for later. Fixed with a
  `ConfigureConventions` override in `SubmissionDbContext` that forces
  `Kind=Utc` on every `DateTime`/`DateTime?` read via a
  `ValueConverter` (`ForceUtcDateTimeKind` migration - empty Up/Down,
  since the fix is metadata-only, no column type changed). This was
  silently latent since Day 32 - the Start endpoint's own response
  never hit it (it returns the freshly-created in-memory entity, which
  already has `Kind=Utc`), only a value re-read from the database via
  mine-lookup ever exposed it, which is exactly the new code path Day
  33 added
- Frontend: `TakeExam` reworked into three internal modes (`take` /
  `review` / `submitted`) in the same component and route, mirroring
  the one-page-multiple-wireframe-screens pattern Day 28's AI Generator
  already established - simpler than threading attempt/answer state
  through separate routes for what's really one continuous session.
  Mount logic now calls the mine-lookup endpoint first: an `InProgress`
  attempt restores its saved answers (and a `visited` set seeded from
  them) and drops the student back into `take` mode where they left
  off; a `Submitted`/`AutoSubmitted` attempt jumps straight to the
  `submitted` view; no attempt at all falls back to calling `start()`
  itself (still safe/idempotent). This let Exam Details' Start Exam Now
  drop the router-state hand-off it grew on Day 32 - Take Exam now
  resolves its own attempt regardless of how the student arrived
- New Review Before Submit mode: the same question navigator plus a
  Review Summary with real Total/Answered/Not Answered/Marked-for-Review
  counts computed from local answer state, Back to Exam (returns to
  `take`, same `currentIndex`) and Submit Exam. New countdown timer
  from `exam.durationMinutes` + the attempt's real `StartedAtUtc`,
  auto-submitting (`AutoSubmitted`) exactly once when it reaches zero
  (guarded by a closure-local flag, not React state, so the interval
  can't double-fire while the submit call is in flight). New Exam
  Submitted view (Total Questions/Submitted On/Status, Go to My Exams -
  no score, per the Phase 7 scope note)
- My Exams' Completed/In Progress tabs now use real data: `useQueries()`
  calling the mine-lookup endpoint once per Published exam, mirroring
  the exact aggregation pattern Phase 6's Question Bank established
  (`useExams()` + per-exam `useQueries()`, merged client-side). A row's
  status is Upcoming (no attempt yet), In Progress, or Completed based
  on the most recent attempt found; Completed rows show a disabled
  "View Result" (visibly disabled, not hidden - Phase 8 wires it for
  real), In Progress rows get a working "Resume Exam" straight to Take
  Exam. Known gap, not fixed: once a student has any attempt on an
  exam, My Exams shows it as Completed/In Progress with no visible way
  to start a further attempt even if `MaxAttempts` allows one - the
  backend correctly allows and enforces multi-attempt exams (tested
  directly), but the retake UI itself isn't wired; flagged here rather
  than silently scoped out, since it wasn't asked for on this day
- 8 new tests (5 `SubmitAttemptHandler`, 3 `GetMyAttemptHandler`) -
  backend total 117/117
- Verified end-to-end in a real browser, matching the plan's exact
  scenario: Student Dashboard/My Exams -> Exam Details -> Start Exam
  Now -> answered one question, marked a second for review -> Review
  Before Submit showed the correct 11/1/10/1 counts -> Back to Exam
  preserved state -> Submit Exam -> Exam Submitted Successfully with no
  score -> My Exams' Completed tab showed it with a disabled View
  Result. Confirmed a third start attempt against a 2-attempt exam was
  blocked with the real 409 message rendered in the UI (not just
  curl). Confirmed the auto-submit timer actually fires by
  backdating a real attempt's `StartedAtUtc` to a few seconds before
  its deadline and loading Take Exam fresh - it counted down and
  auto-submitted correctly once the UTC bug above was fixed. Confirmed
  via curl: double-submit is 409, submitting another user's attempt is
  403, no token is 401, and every existing Admin-only endpoint
  (`POST /api/exams`, `POST /api/questions`) still rejects a Student
  with 403. Cleaned up every throwaway account/attempt and reverted the
  exam's Status/MaxAttempts afterward. `dotnet build`/`dotnet test`
  117/117 green; `npm run build`/`lint`/`test` (25/25) all green

**Phase 7 (Submission Service, Days 31-33) is COMPLETE. Gate passed.**

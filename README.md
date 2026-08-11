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

## Getting Started

### Local Ports / URLs

| App                     | HTTP                    | HTTPS                    |
|--------------------------|--------------------------|----------------------------|
| React (Vite)              | http://localhost:5173  | —                          |
| Gateway (ApiGateway)       | http://localhost:5000  | https://localhost:7000     |
| User API                  | http://localhost:5010  | https://localhost:7010 (Swagger UI at `/swagger`) |

As of Phase 2, all frontend calls go through the Gateway only — it proxies
`/api/users/**` to the User API. The frontend no longer calls User API
directly.

### Backend

```
dotnet restore
dotnet build
dotnet run --project Backend/Services/UserService/OnlineExamSystem.User.API
dotnet run --project Backend/Gateway/OnlineExamSystem.ApiGateway
```

Backend secrets (connection strings, JWT signing keys, etc., once they exist)
go in .NET User Secrets, never in `appsettings.Development.json`:

```
cd Backend/Services/UserService/OnlineExamSystem.User.API
dotnet user-secrets set "Key" "Value"
```

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
UI reference: `wireframe.png`.

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
- Added frontend test infra: Vitest + React Testing Library
  (`npm run test`), jsdom environment, `threads` pool (the default `forks`
  pool hung in this environment)
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

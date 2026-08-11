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

Until Phase 2 (YARP Gateway) is wired up, the frontend calls User API directly.
After Phase 2, all frontend calls go through the Gateway only.

### Backend

```
dotnet restore
dotnet build
dotnet run --project Backend/Services/UserService/OnlineExamSystem.User.API
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
- [ ] Day 7 — Registration API
- [ ] Day 8 — Profile and User APIs
- [ ] Day 9 — User Service gate

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

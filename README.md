# ExamVault

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

### Backend

```
dotnet restore
dotnet build
```

### Frontend

```
cd Frontend/examvault-web
npm install
npm run dev
```

## Development Roadmap

See `ActionPlan.txt` for the full day-by-day execution plan (Phase 0 → Phase 10),
and `Readmap.txt` / `ExamVault_Day_By_Day_Implementation_Hierarchy.docx` /
`ExamVault_Daily_Frontend_Backend_Parallel_Roadmap.docx` for the source roadmaps.
UI reference: `wireframe.png`.

## Phase 0 Progress

- [x] Day 1 — Repository and tooling setup
- [ ] Day 2 — .NET solution skeleton
- [ ] Day 3 — React frontend
- [ ] Day 4 — Configuration and local ports
- [ ] Day 5 — Phase 0 gate

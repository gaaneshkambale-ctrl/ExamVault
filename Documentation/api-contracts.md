# API Contracts

Base URL (local dev): `http://localhost:5000` (the YARP Gateway — the only
entry point the frontend uses; it proxies `/api/users/**` and `/api/exams/**`
to their respective services unchanged, including the `Authorization`
header). User API itself still runs at `http://localhost:5010` and Exam API
at `http://localhost:5020` (each with Swagger UI at `/swagger`) but neither
is called directly by the browser.

## User Service

`GET /api/users/me` requires a valid JWT access token
(`Authorization: Bearer <token>`). Register/Login/Refresh/Logout are
anonymous.

Shapes are defined in `Backend/Shared/OnlineExamSystem.Shared.Contracts`:
- `Requests/User/RegisterUserRequest.cs`
- `Requests/User/LoginUserRequest.cs`
- `Requests/User/RefreshTokenRequest.cs`
- `Responses/User/RegisterUserResponse.cs`
- `Responses/User/UserProfileResponse.cs`
- `Responses/User/LoginResponse.cs`
- `Responses/User/RefreshTokenResponse.cs`

Verified manually against the running services on 2026-08-11 (see
`README.md` Day 9, 10, and 12-15 notes).

## POST /api/users/register

Creates a new user account. Issues no tokens — log in separately afterward.

**Request body**

```json
{
  "fullName": "string, required, max 200 chars",
  "email": "string, required, valid email, max 256 chars",
  "password": "string, required, min 8 chars, needs 1 uppercase + 1 lowercase + 1 digit"
}
```

### 201 Created

Returned on success. No `Location` header — there's no public "get another
user by id" endpoint anymore (see `GET /api/users/me` below).

```json
{
  "id": "8b81bf23-516b-4b76-8765-108077f0f52d",
  "fullName": "Day9 Verify User",
  "email": "day9.verify@example.com"
}
```

### 409 Conflict

Returned when the email is already registered.

```json
{ "message": "A user with this email already exists." }
```

### 400 Bad Request

Returned when the request fails validation. `errors.request` is an array of
human-readable messages (all rule violations, not just the first).

```json
{
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "request": [
      "'Full Name' must not be empty.",
      "'Email' is not a valid email address.",
      "The length of 'Password' must be at least 8 characters. You entered 4 characters.",
      "Password must contain at least one uppercase letter.",
      "Password must contain at least one digit."
    ]
  }
}
```

## POST /api/users/login

Verifies email + password, issues a JWT access token (15 min) and an opaque
refresh token (7 days, persisted server-side as a SHA-256 hash).

**Request body**

```json
{
  "email": "string, required",
  "password": "string, required"
}
```

### 200 OK

```json
{
  "user": {
    "id": "3b0a3df7-6c0c-4f21-a69a-35f711702ac3",
    "fullName": "Phase3 JWT User",
    "email": "phase3.jwt@example.com",
    "role": "Student"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "XUcpz57T5a/CqBVa4LAwUv+2X34XhxbJeFIqXCUZa7UDe..."
}
```

### 401 Unauthorized

Returned for both an unknown email and a wrong password — the same generic
message either way, to avoid leaking which one was wrong (user
enumeration).

```json
{ "message": "Invalid email or password." }
```

## POST /api/users/refresh-token

Rotates a refresh token: validates it (hash lookup, not expired, not
revoked), revokes it, issues + persists a new access/refresh pair. A
refresh token can only be used once — reusing an already-rotated,
expired, or unknown token all produce the same 401.

**Request body**

```json
{ "refreshToken": "string, required" }
```

### 200 OK

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "avjrEXrq+5FhYcT3PDLJa8zcxN1c3kB4WSQVYVq3s0a..."
}
```

### 401 Unauthorized

```json
{ "message": "Invalid or expired refresh token." }
```

## POST /api/users/logout

Revokes the presented refresh token. Always returns 204, even if the token
was already invalid or unknown — logging out an invalid session isn't an
error.

**Request body**

```json
{ "refreshToken": "string, required" }
```

### 204 No Content

No body.

## GET /api/users/me

Returns the authenticated caller's own profile, derived from the access
token's claims. Replaces the old `GET /api/users/{id}` (removed in Phase
3 — this was always the planned swap, called out in the Day 8 code comment).

**Header**: `Authorization: Bearer <accessToken>`

### 200 OK

```json
{
  "id": "3b0a3df7-6c0c-4f21-a69a-35f711702ac3",
  "fullName": "Phase3 JWT User",
  "email": "phase3.jwt@example.com",
  "role": "Student"
}
```

### 401 Unauthorized

Returned when the `Authorization` header is missing or the token is
invalid/expired. No body.

## Exam Service

Every endpoint requires a valid JWT access token with the `Admin` role
(`Authorization: Bearer <token>`) — a `Student` token gets 403 Forbidden.
This is the first role-gated part of the API (the JWT role claim has
existed since Phase 3; this is the first endpoint to actually check it).

Shapes are defined in `Backend/Shared/OnlineExamSystem.Shared.Contracts`:
- `Requests/Exam/CreateExamRequest.cs`
- `Requests/Exam/UpdateExamRequest.cs`
- `Responses/Exam/ExamResponse.cs`

All endpoints exist as of Day 22 (Phase 5 gate): `POST /api/exams`,
`GET /api/exams`, `GET /api/exams/{id}`, `PUT /api/exams/{id}`, and the
three status-transition actions (`publish`/`unpublish`/`archive`).
`ExamResponse` now also carries the Exam Settings fields
(`shuffleQuestions`, `shuffleOptions`, `showResult`, `showCorrectAnswers`,
`allowReview`, `startAtUtc`, `endAtUtc`, `maxAttempts`,
`negativeMarkingEnabled`, `negativeMarks`), added this day.

### POST /api/exams

Creates a new exam. Always created with `status: "Draft"` — publishing is
a separate action (see below). Settings fields (`shuffleQuestions`, etc.)
get the entity's defaults on create; edit them via `PUT /api/exams/{id}`.

**Request body**

```json
{
  "title": "string, required, max 200 chars",
  "description": "string, max 2000 chars",
  "examType": "\"Manual\" or \"AiGenerated\"",
  "durationMinutes": "int, required, > 0",
  "totalMarks": "int, required, > 0",
  "passingMarks": "int, required, 0 <= passingMarks <= totalMarks",
  "instructions": "string, max 2000 chars"
}
```

### 201 Created

```json
{
  "id": "54b2147b-ec59-43d0-a102-900f9659c2af",
  "title": "C# Fundamentals",
  "description": "Covers the basics of C#.",
  "examType": "Manual",
  "durationMinutes": 60,
  "totalMarks": 50,
  "passingMarks": 25,
  "instructions": "Answer all questions.",
  "status": "Draft",
  "totalQuestions": 0,
  "createdOn": "2026-08-12T10:09:35.6119531Z",
  "shuffleQuestions": true,
  "shuffleOptions": true,
  "showResult": true,
  "showCorrectAnswers": false,
  "allowReview": true,
  "startAtUtc": null,
  "endAtUtc": null,
  "maxAttempts": 1,
  "negativeMarkingEnabled": false,
  "negativeMarks": 0
}
```

### 400 Bad Request

Same `ValidationProblemDetails` shape as `POST /api/users/register`
(`errors.request` is an array of human-readable messages).

### 403 Forbidden

Returned for a valid token without the `Admin` role. No body.

## GET /api/exams

Lists every exam, newest first (`CreatedAtUtc` descending). No pagination
or filtering yet. Each entry has the same shape as the
`POST /api/exams` 201 response above.

### 200 OK

```json
[
  { "id": "5f4657f1-1e78-486b-8d25-d0979b77bcbd", "title": "ASP.NET Core", "...": "..." },
  { "id": "54b2147b-ec59-43d0-a102-900f9659c2af", "title": "C# Fundamentals", "...": "..." }
]
```

## GET /api/exams/{id}

Returns a single exam. Same shape as one entry from `GET /api/exams`.

### 404 Not Found

```json
{ "message": "Exam not found." }
```

## PUT /api/exams/{id}

Updates an exam's Basic Information and Settings fields. Does **not**
touch `status` — that's only ever changed via the publish/unpublish/
archive actions below, never by sending an arbitrary `status` value here.

**Request body** — same fields as `POST /api/exams`, plus:

```json
{
  "...": "same fields as POST /api/exams",
  "shuffleQuestions": "bool",
  "shuffleOptions": "bool",
  "showResult": "bool",
  "showCorrectAnswers": "bool",
  "allowReview": "bool",
  "startAtUtc": "ISO datetime or null",
  "endAtUtc": "ISO datetime or null, must be after startAtUtc if both are set",
  "maxAttempts": "int, required, > 0",
  "negativeMarkingEnabled": "bool",
  "negativeMarks": "decimal, required, >= 0"
}
```

### 200 OK

Same shape as `GET /api/exams/{id}`, reflecting the update.

### 400 Bad Request / 404 Not Found

Same shapes as `POST /api/exams` 400 and `GET /api/exams/{id}` 404.

## POST /api/exams/{id}/publish, /unpublish, /archive

Explicit status transitions — the only way `status` ever changes. Allowed
transitions: `Draft -> Published`, `Published -> Draft` (`unpublish`),
`Draft -> Archived`, `Published -> Archived`. `Archived` is terminal — no
transition leads out of it. Each returns the full updated exam on success.

| Action       | Target status |
|--------------|----------------|
| `/publish`   | `Published`    |
| `/unpublish` | `Draft`        |
| `/archive`   | `Archived`     |

### 200 OK

Same shape as `GET /api/exams/{id}`.

### 404 Not Found

```json
{ "message": "Exam not found." }
```

### 409 Conflict

Returned when the transition isn't allowed from the exam's current status
(e.g. publishing an already-archived exam).

```json
{ "message": "Exam cannot transition to Published." }
```

## Question Service

Every endpoint requires a valid JWT access token with the `Admin` role,
same as Exam Service. `POST`/`GET /api/questions`/`GET /api/questions/{id}`
all exist as of Day 25 — `PUT`/`DELETE` land Day 26.

Shapes are defined in `Backend/Shared/OnlineExamSystem.Shared.Contracts`:
- `Requests/Question/CreateQuestionRequest.cs`
- `Responses/Question/QuestionResponse.cs`

Only `MultipleChoice` and `TrueFalse` question types are accepted —
other values (`ShortAnswer`, `FillInTheBlank`, `MatchTheFollowing`,
`CodeProgram`, `Essay`) exist in the domain enum but are rejected by the
validator until a later phase builds real support for them. `ExamId` is
not validated against a real exam (that would mean Question Service
reaching into Exam Service's data — a service-boundary cross this phase
doesn't take).

### POST /api/questions

Creates a question with its options in one call. Exactly one option must
be marked correct. Multiple Choice needs at least two options; True/False
needs exactly two, with `optionText` "True" and "False" (order doesn't
matter, exactly one marked correct).

**Request body**

```json
{
  "examId": "guid, required",
  "questionType": "\"MultipleChoice\" or \"TrueFalse\"",
  "questionText": "string, required, max 2000 chars",
  "marks": "int, required, > 0",
  "difficulty": "\"Easy\", \"Medium\", or \"Hard\"",
  "options": [
    { "optionText": "string, required", "isCorrect": "bool" }
  ]
}
```

### 201 Created

```json
{
  "id": "7eebe881-7723-41e0-914b-fb993adcfc3b",
  "examId": "5f4657f1-1e78-486b-8d25-d0979b77bcbd",
  "questionType": "MultipleChoice",
  "questionText": "Which method starts an ASP.NET Core app?",
  "marks": 2,
  "difficulty": "Medium",
  "options": [
    { "id": "c942c788-554f-4b53-84a9-4627cc175de5", "optionText": "app.Run()", "isCorrect": true, "displayOrder": 0 },
    { "id": "3d995dde-96b3-46f9-b8f5-3819ce019b19", "optionText": "app.Start()", "isCorrect": false, "displayOrder": 1 },
    { "id": "e6dd07b8-1086-4a5f-8780-2c4c78019cf5", "optionText": "app.Execute()", "isCorrect": false, "displayOrder": 2 }
  ],
  "createdOn": "2026-08-12T11:41:08.1206666Z"
}
```

### 400 Bad Request

Same `ValidationProblemDetails` shape as `POST /api/exams`. Common
messages: `"Only Multiple Choice and True/False questions are supported
currently."`, `"Exactly one option must be marked correct."`,
`"Multiple Choice questions need at least two options; True/False
questions need exactly two options: True and False."`

### 403 Forbidden

Returned for a valid token without the `Admin` role. No body.

## GET /api/questions?examId={id}

Lists every question for the given exam, newest first. Each entry has
the same shape as the `POST /api/questions` 201 response above. An exam
with no questions (or an unknown `examId`) returns an empty array, not
404 — the query is always well-formed, it just may match nothing.

### 200 OK

```json
[
  { "id": "91af9829-316b-42ec-8762-45ed44c116c0", "questionType": "TrueFalse", "...": "..." },
  { "id": "7eebe881-7723-41e0-914b-fb993adcfc3b", "questionType": "MultipleChoice", "...": "..." }
]
```

## GET /api/questions/{id}

Returns a single question with its options. Same shape as one entry
from the list endpoint.

### 404 Not Found

```json
{ "message": "Question not found." }
```

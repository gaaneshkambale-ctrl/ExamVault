# User Service API Contracts

Base URL (local dev): `http://localhost:5000` (the YARP Gateway — as of
Phase 2 this is the only entry point the frontend uses; it proxies
`/api/users/**` to the User API unchanged). User API itself still runs at
`http://localhost:5010` (Swagger UI at `/swagger`) but is no longer called
directly by the browser.

These endpoints are unauthenticated for now — Phase 3 adds JWT auth and
replaces the `{id}` route parameter on the profile endpoint with a real
`GET /api/users/me` derived from the token. `POST /api/users/login` was
added ahead of schedule (before Phase 3) as a basic, non-JWT check so the
Login page had something real to call — see README's "Out-of-order: basic
Login" note.

Shapes are defined in `Backend/Shared/OnlineExamSystem.Shared.Contracts`:
- `Requests/User/RegisterUserRequest.cs`
- `Requests/User/LoginUserRequest.cs`
- `Responses/User/RegisterUserResponse.cs`
- `Responses/User/UserProfileResponse.cs`

Verified manually against the running services on 2026-08-11 (see
`README.md` Day 9 and Day 10 notes).

## POST /api/users/register

Creates a new user account.

**Request body**

```json
{
  "fullName": "string, required, max 200 chars",
  "email": "string, required, valid email, max 256 chars",
  "password": "string, required, min 8 chars, needs 1 uppercase + 1 lowercase + 1 digit"
}
```

### 201 Created

Returned on success. `Location` header points at `GET /api/users/{id}`.

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

## GET /api/users/{id}

Fetches a user's profile by id.

**Route parameter**: `id` — GUID.

### 200 OK

```json
{
  "id": "8b81bf23-516b-4b76-8765-108077f0f52d",
  "fullName": "Day9 Verify User",
  "email": "day9.verify@example.com",
  "role": "Student"
}
```

### 404 Not Found

Returned when no user exists with the given id.

```json
{ "message": "User not found." }
```

## POST /api/users/login

Verifies email + password against the stored (hashed) password. Not JWT —
no token is issued, no session is persisted. See README's "Out-of-order:
basic Login" note.

**Request body**

```json
{
  "email": "string, required",
  "password": "string, required"
}
```

### 200 OK

Returned on success. Same shape as `GET /api/users/{id}`.

```json
{
  "id": "3b0a3df7-6c0c-4f21-a69a-35f711702ac3",
  "fullName": "Phase2 Gateway User2",
  "email": "phase2.gateway2@example.com",
  "role": "Student"
}
```

### 401 Unauthorized

Returned for both an unknown email and a wrong password — the same generic
message either way, to avoid leaking which one was wrong (user
enumeration).

```json
{ "message": "Invalid email or password." }
```

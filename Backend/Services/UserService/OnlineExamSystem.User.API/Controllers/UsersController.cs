using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.Shared.Contracts.Requests.User;
using OnlineExamSystem.Shared.Contracts.Responses.User;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Users.ChangePassword;
using OnlineExamSystem.User.Application.Users.Create;
using OnlineExamSystem.User.Application.Users.Delete;
using OnlineExamSystem.User.Application.Users.GetMyPreferences;
using OnlineExamSystem.User.Application.Users.GetMySessions;
using OnlineExamSystem.User.Application.Users.GetProfile;
using OnlineExamSystem.User.Application.Users.List;
using OnlineExamSystem.User.Application.Users.ListSessions;
using OnlineExamSystem.User.Application.Users.Login;
using OnlineExamSystem.User.Application.Users.Logout;
using OnlineExamSystem.User.Application.Users.Register;
using OnlineExamSystem.User.Application.Users.ResetPassword;
using OnlineExamSystem.User.Application.Users.RevokeOtherSessions;
using OnlineExamSystem.User.Application.Users.RevokeSession;
using OnlineExamSystem.User.Application.Users.SetActiveStatus;
using OnlineExamSystem.User.Application.Users.TokenRefresh;
using OnlineExamSystem.User.Application.Users.Update;
using OnlineExamSystem.User.Application.Users.UpdateMyPhoto;
using OnlineExamSystem.User.Application.Users.UpdateMyPreferences;
using OnlineExamSystem.User.Application.Users.UpdateMyProfile;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.API.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly RegisterUserHandler _registerUserHandler;
    private readonly GetUserProfileHandler _getUserProfileHandler;
    private readonly ListUsersHandler _listUsersHandler;
    private readonly CreateUserHandler _createUserHandler;
    private readonly UpdateUserHandler _updateUserHandler;
    private readonly DeleteUserHandler _deleteUserHandler;
    private readonly ResetPasswordHandler _resetPasswordHandler;
    private readonly ChangePasswordHandler _changePasswordHandler;
    private readonly LoginUserHandler _loginUserHandler;
    private readonly RefreshTokenHandler _refreshTokenHandler;
    private readonly LogoutHandler _logoutHandler;
    private readonly SetUserActiveStatusHandler _setUserActiveStatusHandler;
    private readonly ListUserSessionsHandler _listUserSessionsHandler;
    private readonly UpdateMyProfileHandler _updateMyProfileHandler;
    private readonly UpdateMyPhotoHandler _updateMyPhotoHandler;
    private readonly GetMySessionsHandler _getMySessionsHandler;
    private readonly RevokeOtherSessionsHandler _revokeOtherSessionsHandler;
    private readonly RevokeSessionHandler _revokeSessionHandler;
    private readonly GetMyPreferencesHandler _getMyPreferencesHandler;
    private readonly UpdateMyPreferencesHandler _updateMyPreferencesHandler;
    private readonly IAuditClient _auditClient;
    private readonly ILogger<UsersController> _logger;

    private static readonly HashSet<string> AllowedPhotoContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp",
    };

    private const long MaxPhotoSizeBytes = 2 * 1024 * 1024;

    public UsersController(
        RegisterUserHandler registerUserHandler,
        GetUserProfileHandler getUserProfileHandler,
        ListUsersHandler listUsersHandler,
        CreateUserHandler createUserHandler,
        UpdateUserHandler updateUserHandler,
        DeleteUserHandler deleteUserHandler,
        ResetPasswordHandler resetPasswordHandler,
        ChangePasswordHandler changePasswordHandler,
        LoginUserHandler loginUserHandler,
        RefreshTokenHandler refreshTokenHandler,
        LogoutHandler logoutHandler,
        SetUserActiveStatusHandler setUserActiveStatusHandler,
        ListUserSessionsHandler listUserSessionsHandler,
        UpdateMyProfileHandler updateMyProfileHandler,
        UpdateMyPhotoHandler updateMyPhotoHandler,
        GetMySessionsHandler getMySessionsHandler,
        RevokeOtherSessionsHandler revokeOtherSessionsHandler,
        RevokeSessionHandler revokeSessionHandler,
        GetMyPreferencesHandler getMyPreferencesHandler,
        UpdateMyPreferencesHandler updateMyPreferencesHandler,
        IAuditClient auditClient,
        ILogger<UsersController> logger)
    {
        _registerUserHandler = registerUserHandler;
        _getUserProfileHandler = getUserProfileHandler;
        _listUsersHandler = listUsersHandler;
        _createUserHandler = createUserHandler;
        _updateUserHandler = updateUserHandler;
        _deleteUserHandler = deleteUserHandler;
        _resetPasswordHandler = resetPasswordHandler;
        _changePasswordHandler = changePasswordHandler;
        _loginUserHandler = loginUserHandler;
        _refreshTokenHandler = refreshTokenHandler;
        _logoutHandler = logoutHandler;
        _setUserActiveStatusHandler = setUserActiveStatusHandler;
        _listUserSessionsHandler = listUserSessionsHandler;
        _updateMyProfileHandler = updateMyProfileHandler;
        _updateMyPhotoHandler = updateMyPhotoHandler;
        _getMySessionsHandler = getMySessionsHandler;
        _revokeOtherSessionsHandler = revokeOtherSessionsHandler;
        _revokeSessionHandler = revokeSessionHandler;
        _getMyPreferencesHandler = getMyPreferencesHandler;
        _updateMyPreferencesHandler = updateMyPreferencesHandler;
        _auditClient = auditClient;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterUserRequest request, CancellationToken cancellationToken)
    {
        var command = new RegisterUserCommand(request.FullName, request.Email, request.Password);
        var result = await _registerUserHandler.HandleAsync(command, cancellationToken);

        if (result.EmailAlreadyExists)
        {
            _logger.LogWarning("Registration conflict: email {Email} is already registered.", request.Email);
            return Conflict(new { message = "A user with this email already exists." });
        }

        if (!result.Success)
        {
            _logger.LogWarning(
                "Registration validation failed for email {Email}: {Errors}",
                request.Email,
                string.Join("; ", result.ValidationErrors));
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        var user = result.User!;
        _logger.LogInformation("User {UserId} registered successfully.", user.Id);
        var response = new RegisterUserResponse(user.Id, user.FullName, user.Email);
        return StatusCode(StatusCodes.Status201Created, response);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginUserRequest request, CancellationToken cancellationToken)
    {
        var command = new LoginUserCommand(
            request.Email,
            request.Password,
            Request.Headers.UserAgent.ToString(),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            request.TenantSlug);
        var result = await _loginUserHandler.HandleAsync(command, cancellationToken);

        if (result.IsAccountDeactivated)
        {
            _logger.LogWarning("Login blocked for deactivated account {Email}.", request.Email);
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new { message = "Your account has been deactivated. Contact an administrator." });
        }

        if (!result.Success)
        {
            _logger.LogWarning("Login failed for email {Email}.", request.Email);
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var user = result.User!;
        _logger.LogInformation("User {UserId} logged in successfully.", user.Id);
        var profile = ToProfileResponse(user);
        var response = new LoginResponse(profile, result.AccessToken!, result.RefreshToken!);
        return Ok(response);
    }

    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var command = new RefreshTokenCommand(
            request.RefreshToken,
            Request.Headers.UserAgent.ToString(),
            HttpContext.Connection.RemoteIpAddress?.ToString());
        var result = await _refreshTokenHandler.HandleAsync(command, cancellationToken);

        if (!result.Success)
        {
            _logger.LogWarning("Refresh token rejected.");
            return Unauthorized(new { message = "Invalid or expired refresh token." });
        }

        return Ok(new RefreshTokenResponse(result.AccessToken!, result.RefreshToken!));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        await _logoutHandler.HandleAsync(new LogoutCommand(request.RefreshToken), cancellationToken);
        return NoContent();
    }

    // SuperAdmin added here (not on every other Admin-only action) because
    // GetAllAsync now honors the IsSuperAdmin bypass itself - this is the
    // one endpoint the new Super Admin "All Users" page needs, and a
    // regular Admin still only ever sees their own tenant's users through
    // it (see UserRepository.GetAllAsync's own comment).
    [Authorize(Roles = "Admin,SuperAdmin")]
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var users = await _listUsersHandler.HandleAsync(new ListUsersQuery(), cancellationToken);
        return Ok(users.Select(ToResponse));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequest request, CancellationToken cancellationToken)
    {
        var tenantId = Guid.Parse(User.FindFirstValue(TenantClaimTypes.TenantId)!);
        var command = new CreateUserCommand(
            tenantId,
            request.FullName,
            request.Email,
            request.Role,
            request.PhoneNumber,
            request.RollNumber);
        var result = await _createUserHandler.HandleAsync(command, cancellationToken);

        if (result.EmailAlreadyExists)
        {
            _logger.LogWarning("Admin create-user conflict: email {Email} is already registered.", request.Email);
            return Conflict(new { message = "A user with this email already exists." });
        }

        if (!result.Success)
        {
            _logger.LogWarning(
                "Admin create-user validation failed for email {Email}: {Errors}",
                request.Email,
                string.Join("; ", result.ValidationErrors));
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        var user = result.User!;
        _logger.LogInformation("User {UserId} created by admin.", user.Id);
        return StatusCode(StatusCodes.Status201Created, ToResponse(user));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateUserRequest request, CancellationToken cancellationToken)
    {
        var command = new UpdateUserCommand(
            id,
            request.FullName,
            request.Email,
            request.Role,
            request.PhoneNumber,
            request.RollNumber);
        var result = await _updateUserHandler.HandleAsync(command, cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "User not found." });
        }

        if (result.EmailAlreadyExists)
        {
            return Conflict(new { message = "A user with this email already exists." });
        }

        if (!result.Success)
        {
            _logger.LogWarning(
                "Admin update-user validation failed for {UserId}: {Errors}",
                id,
                string.Join("; ", result.ValidationErrors));
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        _logger.LogInformation("User {UserId} updated by admin.", id);
        var adminId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _auditClient.RecordAsync(
            Guid.Parse(User.FindFirstValue(TenantClaimTypes.TenantId)!),
            "Users",
            "Updated user details",
            result.User!.FullName,
            id.ToString(),
            adminId,
            User.FindFirstValue(ClaimTypes.Email),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);
        return Ok(ToResponse(result.User!));
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var currentUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (id == currentUserId)
        {
            return Conflict(new { message = "You cannot delete your own account." });
        }

        var result = await _deleteUserHandler.HandleAsync(new DeleteUserCommand(id), cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "User not found." });
        }

        _logger.LogInformation("User {UserId} deleted by admin {AdminId}.", id, currentUserId);
        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("{id:guid}/deactivate")]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken cancellationToken)
    {
        var currentUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (id == currentUserId)
        {
            return Conflict(new { message = "You cannot deactivate your own account." });
        }

        var result = await _setUserActiveStatusHandler.HandleAsync(
            new SetUserActiveStatusCommand(id, false),
            cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "User not found." });
        }

        _logger.LogInformation("User {UserId} deactivated by admin {AdminId}.", id, currentUserId);
        return Ok(ToResponse(result.User!));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("{id:guid}/activate")]
    public async Task<IActionResult> Activate(Guid id, CancellationToken cancellationToken)
    {
        var result = await _setUserActiveStatusHandler.HandleAsync(
            new SetUserActiveStatusCommand(id, true),
            cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "User not found." });
        }

        _logger.LogInformation("User {UserId} reactivated by admin.", id);
        return Ok(ToResponse(result.User!));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(
        Guid id,
        ResetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        var command = new ResetPasswordCommand(id, request.NewPassword);
        var result = await _resetPasswordHandler.HandleAsync(command, cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "User not found." });
        }

        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        _logger.LogInformation("Password reset by admin for user {UserId}.", id);
        return NoContent();
    }

    [Authorize]
    [HttpPut("me/password")]
    public async Task<IActionResult> ChangeMyPassword(ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var command = new ChangePasswordCommand(userId, request.CurrentPassword, request.NewPassword);
        var result = await _changePasswordHandler.HandleAsync(command, cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "User not found." });
        }

        if (result.IsCurrentPasswordWrong)
        {
            return BadRequest(new { message = "Current password is incorrect." });
        }

        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        _logger.LogInformation("User {UserId} changed their own password.", userId);
        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var user = await _getUserProfileHandler.HandleAsync(new GetUserProfileQuery(id, TenantScoped: true), cancellationToken);
        if (user is null)
        {
            return NotFound(new { message = "User not found." });
        }

        return Ok(ToResponse(user));
    }

    // Admin-only counterpart to GetMyPhoto - lets admin screens (e.g. Live
    // Monitoring's student avatars) render another user's photo, which no
    // endpoint supported before this.
    [Authorize(Roles = "Admin")]
    [HttpGet("{id:guid}/photo")]
    public async Task<IActionResult> GetPhoto(Guid id, CancellationToken cancellationToken)
    {
        var user = await _getUserProfileHandler.HandleAsync(new GetUserProfileQuery(id, TenantScoped: true), cancellationToken);
        if (user?.PhotoData is null)
        {
            return NotFound();
        }

        return File(user.PhotoData, user.PhotoContentType ?? "application/octet-stream");
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("{id:guid}/sessions")]
    public async Task<IActionResult> ListSessions(Guid id, CancellationToken cancellationToken)
    {
        var sessions = await _listUserSessionsHandler.HandleAsync(new ListUserSessionsQuery(id), cancellationToken);
        return Ok(sessions.Select(ToResponse));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _getUserProfileHandler.HandleAsync(new GetUserProfileQuery(userId), cancellationToken);
        if (user is null)
        {
            _logger.LogWarning("Profile lookup failed for authenticated user {UserId}.", userId);
            return NotFound(new { message = "User not found." });
        }

        var response = ToProfileResponse(user);
        return Ok(response);
    }

    [Authorize]
    [HttpPut("me")]
    public async Task<IActionResult> UpdateMyProfile(UpdateMyProfileRequest request, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var command = new UpdateMyProfileCommand(
            userId,
            request.FullName,
            request.PhoneNumber,
            request.Username,
            request.AlternateEmail,
            request.Gender,
            request.DateOfBirth,
            request.Location,
            request.Department,
            request.Designation);
        var result = await _updateMyProfileHandler.HandleAsync(command, cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "User not found." });
        }

        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        var user = result.User!;
        _logger.LogInformation("User {UserId} updated their own profile.", userId);
        var response = ToProfileResponse(user);
        return Ok(response);
    }

    [Authorize]
    [HttpGet("me/preferences")]
    public async Task<IActionResult> GetMyPreferences(CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var preferences = await _getMyPreferencesHandler.HandleAsync(new GetMyPreferencesQuery(userId), cancellationToken);
        return Ok(new UserPreferencesResponse(
            preferences.Language, preferences.Timezone, preferences.DateFormat, preferences.TimeFormat.ToString(), preferences.Theme.ToString()));
    }

    [Authorize]
    [HttpPut("me/preferences")]
    public async Task<IActionResult> UpdateMyPreferences(UpdateUserPreferencesRequest request, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var preferences = await _updateMyPreferencesHandler.HandleAsync(
            new UpdateMyPreferencesCommand(userId, request.Language, request.Timezone, request.DateFormat, request.TimeFormat, request.Theme),
            cancellationToken);
        return Ok(new UserPreferencesResponse(
            preferences.Language, preferences.Timezone, preferences.DateFormat, preferences.TimeFormat.ToString(), preferences.Theme.ToString()));
    }

    // Self-service counterpart to the admin-only {id}/deactivate above.
    // Deliberately Student-only, enforced HERE (not just hidden client-side)
    // because Admins already have a real, deliberate protection against
    // deactivating their own account - this must not become a backdoor
    // around that rule.
    [Authorize]
    [HttpPost("me/deactivate")]
    public async Task<IActionResult> DeactivateMyAccount(CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (!string.Equals(role, nameof(UserRole.Student), StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(new { message = "Only student accounts can be self-deactivated." });
        }

        var result = await _setUserActiveStatusHandler.HandleAsync(
            new SetUserActiveStatusCommand(userId, false),
            cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "User not found." });
        }

        _logger.LogInformation("User {UserId} deactivated their own account.", userId);
        await _auditClient.RecordAsync(
            Guid.Parse(User.FindFirstValue(TenantClaimTypes.TenantId)!),
            "Auth",
            "Self-deactivated account",
            null,
            null,
            userId,
            result.User!.FullName,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);
        return NoContent();
    }

    [Authorize]
    [HttpPut("me/photo")]
    [RequestSizeLimit(MaxPhotoSizeBytes)]
    public async Task<IActionResult> UpdateMyPhoto(IFormFile photo, CancellationToken cancellationToken)
    {
        if (photo is null || photo.Length == 0)
        {
            return BadRequest(new { message = "No photo file was provided." });
        }

        if (photo.Length > MaxPhotoSizeBytes)
        {
            return BadRequest(new { message = "Photo must be 2 MB or smaller." });
        }

        if (!AllowedPhotoContentTypes.Contains(photo.ContentType))
        {
            return BadRequest(new { message = "Photo must be a JPEG, PNG, or WebP image." });
        }

        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        using var memoryStream = new MemoryStream();
        await photo.CopyToAsync(memoryStream, cancellationToken);

        var result = await _updateMyPhotoHandler.HandleAsync(
            new UpdateMyPhotoCommand(userId, memoryStream.ToArray(), photo.ContentType),
            cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "User not found." });
        }

        _logger.LogInformation("User {UserId} updated their profile photo.", userId);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me/photo")]
    public async Task<IActionResult> GetMyPhoto(CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _getUserProfileHandler.HandleAsync(new GetUserProfileQuery(userId), cancellationToken);
        if (user?.PhotoData is null)
        {
            return NotFound();
        }

        return File(user.PhotoData, user.PhotoContentType ?? "application/octet-stream");
    }

    [Authorize]
    [HttpGet("me/sessions")]
    public async Task<IActionResult> ListMySessions(CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var currentRefreshToken = Request.Headers["X-Refresh-Token"].ToString();
        var sessions = await _getMySessionsHandler.HandleAsync(
            new GetMySessionsQuery(userId, string.IsNullOrWhiteSpace(currentRefreshToken) ? null : currentRefreshToken),
            cancellationToken);

        return Ok(sessions.Select(s => new UserSessionResponse(
            s.Id,
            s.IssuedAtUtc,
            s.ExpiresAtUtc,
            s.RevokedAtUtc,
            s.Status,
            s.DeviceLabel,
            s.IsCurrent,
            s.IpAddress)));
    }

    [Authorize]
    [HttpPost("me/sessions/revoke-others")]
    public async Task<IActionResult> RevokeOtherSessions(CancellationToken cancellationToken)
    {
        var currentRefreshToken = Request.Headers["X-Refresh-Token"].ToString();
        if (string.IsNullOrWhiteSpace(currentRefreshToken))
        {
            return BadRequest(new { message = "Current session token is required." });
        }

        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _revokeOtherSessionsHandler.HandleAsync(
            new RevokeOtherSessionsCommand(userId, currentRefreshToken),
            cancellationToken);

        _logger.LogInformation("User {UserId} signed out their other sessions.", userId);
        return NoContent();
    }

    // Per-row Sign Out - single-session counterpart to revoke-others above.
    // The handler enforces ownership (userId + sessionId must match the same
    // row), so a user can never revoke someone else's session by guessing an id.
    [Authorize]
    [HttpPost("me/sessions/{id:guid}/revoke")]
    public async Task<IActionResult> RevokeSession(Guid id, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var revoked = await _revokeSessionHandler.HandleAsync(new RevokeSessionCommand(userId, id), cancellationToken);

        if (!revoked)
        {
            return NotFound(new { message = "Session not found." });
        }

        _logger.LogInformation("User {UserId} signed out session {SessionId}.", userId, id);
        return NoContent();
    }

    private static UserListItemResponse ToResponse(AppUser user) =>
        new(
            user.Id,
            user.FullName,
            user.Email,
            user.Role.ToString(),
            user.CreatedAtUtc,
            user.IsActive,
            user.PhoneNumber,
            user.PhotoData is not null,
            user.RollNumber,
            user.TenantId,
            user.LastLoginAtUtc);

    private static UserSessionResponse ToResponse(RefreshToken token)
    {
        var status = token.RevokedAtUtc is not null
            ? "Revoked"
            : token.ExpiresAtUtc <= DateTime.UtcNow
                ? "Expired"
                : "Active";

        return new UserSessionResponse(
            token.Id,
            token.CreatedAtUtc,
            token.ExpiresAtUtc,
            token.RevokedAtUtc,
            status,
            token.DeviceLabel ?? "Unknown device",
            IpAddress: token.IpAddress);
    }

    // "EV-ADM-0001" / "EV-STU-0001" - a real formatted id built from the
    // user's own real auto-increment UserNumber, not a display trick over
    // the GUID.
    private static string FormatUserId(AppUser user)
    {
        var roleCode = user.Role switch
        {
            UserRole.Admin => "ADM",
            UserRole.SuperAdmin => "SUP",
            _ => "STU",
        };
        return $"EV-{roleCode}-{user.UserNumber:D4}";
    }

    private static UserProfileResponse ToProfileResponse(AppUser user) =>
        new(
            user.Id,
            user.FullName,
            user.Email,
            user.Role.ToString(),
            user.MustChangePassword,
            user.PhoneNumber,
            user.PhotoData is not null,
            user.Username,
            user.AlternateEmail,
            user.Gender?.ToString(),
            user.DateOfBirth,
            user.Location,
            user.Department,
            user.Designation,
            user.LastLoginAtUtc,
            user.CreatedAtUtc,
            FormatUserId(user),
            user.IsActive);
}

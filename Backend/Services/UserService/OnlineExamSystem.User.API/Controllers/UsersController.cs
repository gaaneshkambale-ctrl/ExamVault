using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Shared.Contracts.Requests.User;
using OnlineExamSystem.Shared.Contracts.Responses.User;
using OnlineExamSystem.User.Application.Users.Create;
using OnlineExamSystem.User.Application.Users.Delete;
using OnlineExamSystem.User.Application.Users.GetProfile;
using OnlineExamSystem.User.Application.Users.List;
using OnlineExamSystem.User.Application.Users.Login;
using OnlineExamSystem.User.Application.Users.Logout;
using OnlineExamSystem.User.Application.Users.Register;
using OnlineExamSystem.User.Application.Users.ResetPassword;
using OnlineExamSystem.User.Application.Users.TokenRefresh;
using OnlineExamSystem.User.Application.Users.Update;
using OnlineExamSystem.User.Domain.Entities;

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
    private readonly LoginUserHandler _loginUserHandler;
    private readonly RefreshTokenHandler _refreshTokenHandler;
    private readonly LogoutHandler _logoutHandler;
    private readonly ILogger<UsersController> _logger;

    public UsersController(
        RegisterUserHandler registerUserHandler,
        GetUserProfileHandler getUserProfileHandler,
        ListUsersHandler listUsersHandler,
        CreateUserHandler createUserHandler,
        UpdateUserHandler updateUserHandler,
        DeleteUserHandler deleteUserHandler,
        ResetPasswordHandler resetPasswordHandler,
        LoginUserHandler loginUserHandler,
        RefreshTokenHandler refreshTokenHandler,
        LogoutHandler logoutHandler,
        ILogger<UsersController> logger)
    {
        _registerUserHandler = registerUserHandler;
        _getUserProfileHandler = getUserProfileHandler;
        _listUsersHandler = listUsersHandler;
        _createUserHandler = createUserHandler;
        _updateUserHandler = updateUserHandler;
        _deleteUserHandler = deleteUserHandler;
        _resetPasswordHandler = resetPasswordHandler;
        _loginUserHandler = loginUserHandler;
        _refreshTokenHandler = refreshTokenHandler;
        _logoutHandler = logoutHandler;
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
        var command = new LoginUserCommand(request.Email, request.Password);
        var result = await _loginUserHandler.HandleAsync(command, cancellationToken);

        if (!result.Success)
        {
            _logger.LogWarning("Login failed for email {Email}.", request.Email);
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var user = result.User!;
        _logger.LogInformation("User {UserId} logged in successfully.", user.Id);
        var profile = new UserProfileResponse(user.Id, user.FullName, user.Email, user.Role.ToString());
        var response = new LoginResponse(profile, result.AccessToken!, result.RefreshToken!);
        return Ok(response);
    }

    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var command = new RefreshTokenCommand(request.RefreshToken);
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

    [Authorize(Roles = "Admin")]
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
        var command = new CreateUserCommand(request.FullName, request.Email, request.Password, request.Role);
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
        var command = new UpdateUserCommand(id, request.FullName, request.Email, request.Role);
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

    [Authorize(Roles = "Admin")]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var user = await _getUserProfileHandler.HandleAsync(new GetUserProfileQuery(id), cancellationToken);
        if (user is null)
        {
            return NotFound(new { message = "User not found." });
        }

        return Ok(ToResponse(user));
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

        var response = new UserProfileResponse(user.Id, user.FullName, user.Email, user.Role.ToString());
        return Ok(response);
    }

    private static UserListItemResponse ToResponse(AppUser user) =>
        new(user.Id, user.FullName, user.Email, user.Role.ToString(), user.CreatedAtUtc);
}

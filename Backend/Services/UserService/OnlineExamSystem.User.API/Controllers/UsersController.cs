using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Shared.Contracts.Requests.User;
using OnlineExamSystem.Shared.Contracts.Responses.User;
using OnlineExamSystem.User.Application.Users.GetProfile;
using OnlineExamSystem.User.Application.Users.Login;
using OnlineExamSystem.User.Application.Users.Logout;
using OnlineExamSystem.User.Application.Users.Register;
using OnlineExamSystem.User.Application.Users.TokenRefresh;

namespace OnlineExamSystem.User.API.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly RegisterUserHandler _registerUserHandler;
    private readonly GetUserProfileHandler _getUserProfileHandler;
    private readonly LoginUserHandler _loginUserHandler;
    private readonly RefreshTokenHandler _refreshTokenHandler;
    private readonly LogoutHandler _logoutHandler;
    private readonly ILogger<UsersController> _logger;

    public UsersController(
        RegisterUserHandler registerUserHandler,
        GetUserProfileHandler getUserProfileHandler,
        LoginUserHandler loginUserHandler,
        RefreshTokenHandler refreshTokenHandler,
        LogoutHandler logoutHandler,
        ILogger<UsersController> logger)
    {
        _registerUserHandler = registerUserHandler;
        _getUserProfileHandler = getUserProfileHandler;
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
}

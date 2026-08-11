using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Shared.Contracts.Requests.User;
using OnlineExamSystem.Shared.Contracts.Responses.User;
using OnlineExamSystem.User.Application.Users.GetProfile;
using OnlineExamSystem.User.Application.Users.Login;
using OnlineExamSystem.User.Application.Users.Register;

namespace OnlineExamSystem.User.API.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly RegisterUserHandler _registerUserHandler;
    private readonly GetUserProfileHandler _getUserProfileHandler;
    private readonly LoginUserHandler _loginUserHandler;
    private readonly ILogger<UsersController> _logger;

    public UsersController(
        RegisterUserHandler registerUserHandler,
        GetUserProfileHandler getUserProfileHandler,
        LoginUserHandler loginUserHandler,
        ILogger<UsersController> logger)
    {
        _registerUserHandler = registerUserHandler;
        _getUserProfileHandler = getUserProfileHandler;
        _loginUserHandler = loginUserHandler;
        _logger = logger;
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
        var response = new UserProfileResponse(user.Id, user.FullName, user.Email, user.Role.ToString());
        return Ok(response);
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
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, response);
    }

    // Unauthenticated/stubbed foundation for now - Phase 3 replaces the {id} route
    // parameter with the caller's identity from the JWT (a real "GET /api/users/me").
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var user = await _getUserProfileHandler.HandleAsync(new GetUserProfileQuery(id), cancellationToken);
        if (user is null)
        {
            _logger.LogWarning("Profile lookup failed: user {UserId} not found.", id);
            return NotFound(new { message = "User not found." });
        }

        var response = new UserProfileResponse(user.Id, user.FullName, user.Email, user.Role.ToString());
        return Ok(response);
    }
}

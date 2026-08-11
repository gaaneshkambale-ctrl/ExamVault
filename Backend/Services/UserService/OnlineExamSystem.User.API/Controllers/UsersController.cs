using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Shared.Contracts.Requests.User;
using OnlineExamSystem.Shared.Contracts.Responses.User;
using OnlineExamSystem.User.Application.Users.GetProfile;
using OnlineExamSystem.User.Application.Users.Register;

namespace OnlineExamSystem.User.API.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly RegisterUserHandler _registerUserHandler;
    private readonly GetUserProfileHandler _getUserProfileHandler;

    public UsersController(RegisterUserHandler registerUserHandler, GetUserProfileHandler getUserProfileHandler)
    {
        _registerUserHandler = registerUserHandler;
        _getUserProfileHandler = getUserProfileHandler;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterUserRequest request, CancellationToken cancellationToken)
    {
        var command = new RegisterUserCommand(request.FullName, request.Email, request.Password);
        var result = await _registerUserHandler.HandleAsync(command, cancellationToken);

        if (result.EmailAlreadyExists)
        {
            return Conflict(new { message = "A user with this email already exists." });
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
            return NotFound(new { message = "User not found." });
        }

        var response = new UserProfileResponse(user.Id, user.FullName, user.Email, user.Role.ToString());
        return Ok(response);
    }
}

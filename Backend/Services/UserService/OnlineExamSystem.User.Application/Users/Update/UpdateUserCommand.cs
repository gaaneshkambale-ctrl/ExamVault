namespace OnlineExamSystem.User.Application.Users.Update;

public record UpdateUserCommand(
    Guid Id,
    string FullName,
    string Email,
    string Role,
    string? PhoneNumber = null,
    string? RollNumber = null,
    Dictionary<string, string>? AcademicFields = null,
    // The caller's own user id, from the request's JWT - null for any path
    // that doesn't have an authenticated caller (there isn't one today, but
    // keeps this command usable outside a controller). Used only to block
    // an Admin from changing their OWN role (see UpdateUserHandler) - same
    // self-lockout protection UsersController.Delete/Deactivate already
    // have, just missing here until now.
    Guid? CallerUserId = null);

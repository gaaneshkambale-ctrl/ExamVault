namespace OnlineExamSystem.User.Application.Users.UpdateMyProfile;

public record UpdateMyProfileCommand(
    Guid UserId,
    string FullName,
    string? PhoneNumber,
    string? Username = null,
    string? AlternateEmail = null,
    string? Gender = null,
    DateTime? DateOfBirth = null,
    string? Location = null,
    string? Department = null);

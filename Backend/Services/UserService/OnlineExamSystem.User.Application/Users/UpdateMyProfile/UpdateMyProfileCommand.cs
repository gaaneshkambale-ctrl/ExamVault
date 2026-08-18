namespace OnlineExamSystem.User.Application.Users.UpdateMyProfile;

public record UpdateMyProfileCommand(Guid UserId, string FullName, string? PhoneNumber);

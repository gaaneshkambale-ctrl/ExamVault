namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record UserProfileResponse(Guid Id, string FullName, string Email, string Role, bool MustChangePassword);

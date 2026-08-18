namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record UpdateMyProfileRequest(string FullName, string? PhoneNumber = null);

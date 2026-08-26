namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record LoginResponse(UserProfileResponse User, string AccessToken, string RefreshToken);

namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

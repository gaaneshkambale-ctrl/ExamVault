namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record UserListItemResponse(
    Guid Id,
    string FullName,
    string Email,
    string Role,
    DateTime CreatedAtUtc,
    bool IsActive,
    string? PhoneNumber);

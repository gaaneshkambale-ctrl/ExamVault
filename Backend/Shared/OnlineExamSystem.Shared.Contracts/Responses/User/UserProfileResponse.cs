namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record UserProfileResponse(
    Guid Id,
    string FullName,
    string Email,
    string Role,
    bool MustChangePassword,
    string? PhoneNumber = null,
    bool HasPhoto = false,
    string? Username = null,
    string? AlternateEmail = null,
    string? Gender = null,
    DateTime? DateOfBirth = null,
    string? Location = null,
    string? Department = null,
    DateTime? LastLoginAtUtc = null,
    DateTime? JoinedOnUtc = null,
    string? FormattedUserId = null,
    bool IsActive = true);

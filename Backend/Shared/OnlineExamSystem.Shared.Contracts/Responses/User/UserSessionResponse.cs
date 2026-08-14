namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record UserSessionResponse(
    Guid Id,
    DateTime IssuedAtUtc,
    DateTime ExpiresAtUtc,
    DateTime? RevokedAtUtc,
    string Status);

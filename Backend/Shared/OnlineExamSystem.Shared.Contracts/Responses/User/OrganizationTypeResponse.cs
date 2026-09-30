namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record OrganizationTypeResponse(
    Guid Id,
    string Name,
    bool IsActive,
    int SortOrder,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

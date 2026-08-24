namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record PlanResponse(
    Guid Id,
    string Name,
    string? Description,
    IReadOnlyList<string> IncludedFeatures,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

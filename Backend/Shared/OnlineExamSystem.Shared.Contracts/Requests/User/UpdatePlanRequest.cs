namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record UpdatePlanRequest(string Name, string? Description, IReadOnlyList<string> IncludedFeatures);

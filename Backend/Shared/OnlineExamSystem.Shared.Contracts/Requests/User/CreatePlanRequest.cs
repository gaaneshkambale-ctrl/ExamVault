namespace OnlineExamSystem.Shared.Contracts.Requests.User;

// IncludedFeatures are the PlanFeature enum's names as strings (e.g.
// ["Users", "Exams"]) - kept as plain strings at the contract boundary like
// every other enum in this codebase's request/response DTOs.
public record CreatePlanRequest(string Name, string? Description, IReadOnlyList<string> IncludedFeatures);

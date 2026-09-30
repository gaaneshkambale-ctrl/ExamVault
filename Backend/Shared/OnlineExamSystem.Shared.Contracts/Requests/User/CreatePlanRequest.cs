namespace OnlineExamSystem.Shared.Contracts.Requests.User;

// IncludedFeatures are the PlanFeature enum's names as strings (e.g.
// ["Users", "Exams"]) - kept as plain strings at the contract boundary like
// every other enum in this codebase's request/response DTOs.
public record CreatePlanRequest(
    string Name,
    string? Description,
    IReadOnlyList<string> IncludedFeatures,
    decimal? MonthlyPrice = null,
    decimal? AnnualPrice = null,
    int? MaxStudents = null,
    int? MaxAdmins = null,
    int? MaxInstructors = null,
    int? MaxExams = null,
    int? MaxQuestions = null,
    int? MaxAiQuestionsPerMonth = null,
    int? StorageGb = null);

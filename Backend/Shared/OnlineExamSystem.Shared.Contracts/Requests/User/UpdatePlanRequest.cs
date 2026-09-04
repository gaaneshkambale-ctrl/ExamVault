namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record UpdatePlanRequest(
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

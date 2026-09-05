namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record PlanResponse(
    Guid Id,
    string Name,
    string? Description,
    IReadOnlyList<string> IncludedFeatures,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    decimal? MonthlyPrice = null,
    decimal? AnnualPrice = null,
    int? MaxStudents = null,
    int? MaxAdmins = null,
    int? MaxInstructors = null,
    int? MaxExams = null,
    int? MaxQuestions = null,
    int? MaxAiQuestionsPerMonth = null,
    int? StorageGb = null,
    Guid? CreatedByUserId = null,
    Guid? UpdatedByUserId = null,
    string? CreatedByName = null,
    string? UpdatedByName = null);

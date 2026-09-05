using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.User.Application.Plans.Create;

public record CreatePlanCommand(
    string Name,
    string? Description,
    IReadOnlyList<PlanFeature> IncludedFeatures,
    decimal? MonthlyPrice = null,
    decimal? AnnualPrice = null,
    int? MaxStudents = null,
    int? MaxAdmins = null,
    int? MaxInstructors = null,
    int? MaxExams = null,
    int? MaxQuestions = null,
    int? MaxAiQuestionsPerMonth = null,
    int? StorageGb = null,
    Guid? CreatedByUserId = null);

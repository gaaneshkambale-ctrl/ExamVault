using OnlineExamSystem.Result.Domain;

namespace OnlineExamSystem.Result.Application.GetExamReport;

public class GetExamReportResult
{
    public bool Success { get; init; }
    public bool IsExamNotFound { get; init; }
    public bool IsProviderFailure { get; init; }
    public string? ProviderErrorMessage { get; init; }
    public AdminExamReport? Report { get; init; }

    public static GetExamReportResult Ok(AdminExamReport report) => new() { Success = true, Report = report };

    public static GetExamReportResult ExamNotFound() => new() { IsExamNotFound = true };

    public static GetExamReportResult ProviderFailure(string message) =>
        new() { IsProviderFailure = true, ProviderErrorMessage = message };
}

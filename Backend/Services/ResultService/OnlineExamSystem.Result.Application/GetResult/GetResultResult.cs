using OnlineExamSystem.Result.Domain;

namespace OnlineExamSystem.Result.Application.GetResult;

public class GetResultResult
{
    public bool Success { get; init; }
    public bool IsExamNotFound { get; init; }
    public bool IsNotSubmitted { get; init; }
    public bool IsNotRevealed { get; init; }
    public bool IsProviderFailure { get; init; }
    public string? ProviderErrorMessage { get; init; }
    public ExamResultSummary? Summary { get; init; }

    public static GetResultResult Ok(ExamResultSummary summary) => new() { Success = true, Summary = summary };

    public static GetResultResult ExamNotFound() => new() { IsExamNotFound = true };

    public static GetResultResult NotSubmitted() => new() { IsNotSubmitted = true };

    public static GetResultResult NotRevealed() => new() { IsNotRevealed = true };

    public static GetResultResult ProviderFailure(string message) =>
        new() { IsProviderFailure = true, ProviderErrorMessage = message };
}

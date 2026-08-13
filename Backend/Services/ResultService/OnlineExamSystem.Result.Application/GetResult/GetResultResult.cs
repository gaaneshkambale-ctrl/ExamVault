using OnlineExamSystem.Result.Domain;

namespace OnlineExamSystem.Result.Application.GetResult;

public class GetResultResult
{
    public bool Success { get; init; }
    public bool IsExamNotFound { get; init; }
    public bool IsNotSubmitted { get; init; }
    public ExamResultSummary? Summary { get; init; }

    public static GetResultResult Ok(ExamResultSummary summary) => new() { Success = true, Summary = summary };

    public static GetResultResult ExamNotFound() => new() { IsExamNotFound = true };

    public static GetResultResult NotSubmitted() => new() { IsNotSubmitted = true };
}

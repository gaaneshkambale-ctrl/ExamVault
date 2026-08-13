namespace OnlineExamSystem.Result.Domain;

public class ExamResultSummary
{
    public Guid AttemptId { get; init; }
    public Guid ExamId { get; init; }
    public string ExamTitle { get; init; } = string.Empty;
    public int TotalScore { get; init; }
    public int TotalMarks { get; init; }
    public int PassingMarks { get; init; }
    public bool Passed { get; init; }
    public DateTime SubmittedAtUtc { get; init; }
}

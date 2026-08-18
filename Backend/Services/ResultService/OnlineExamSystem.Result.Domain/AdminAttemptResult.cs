namespace OnlineExamSystem.Result.Domain;

public class AdminExamReport
{
    public Guid ExamId { get; init; }
    public string ExamTitle { get; init; } = string.Empty;
    public int TotalMarks { get; init; }
    public int PassingMarks { get; init; }
    public IReadOnlyList<AdminAttemptResult> Attempts { get; init; } = [];
}

public class AdminAttemptResult
{
    public Guid AttemptId { get; init; }
    public Guid UserId { get; init; }
    public int TotalScore { get; init; }
    public bool Passed { get; init; }
    public DateTime SubmittedAtUtc { get; init; }
    public IReadOnlyList<QuestionResult> Questions { get; init; } = [];
    public int FullscreenExitCount { get; init; }
}

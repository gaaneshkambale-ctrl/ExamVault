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
    public decimal TotalScore { get; init; }
    public bool Passed { get; init; }
    public DateTime SubmittedAtUtc { get; init; }
    public IReadOnlyList<QuestionResult> Questions { get; init; } = [];
    public bool HasPendingGrading { get; init; }
    public int FullscreenExitCount { get; init; }
    public int NoFaceDetectedCount { get; init; }
    public int MultipleFacesDetectedCount { get; init; }
    public int TabSwitchCount { get; init; }
    public int MultipleTabsCount { get; init; }
    public int CopyPasteCount { get; init; }
    public int RightClickCount { get; init; }
    public int MultipleMonitorsCount { get; init; }

    public int CorrectCount { get; init; }
    public int IncorrectCount { get; init; }
    public int SkippedCount { get; init; }
    public double Accuracy { get; init; }

    // Null for every attempt except a user's own LATEST submitted attempt on
    // this exam (see ExamRankingCalculator) - an earlier, superseded attempt
    // by the same student is still listed here but never ranked.
    public int? Rank { get; init; }
    public double? Percentile { get; init; }
    public int? TotalParticipants { get; init; }
}

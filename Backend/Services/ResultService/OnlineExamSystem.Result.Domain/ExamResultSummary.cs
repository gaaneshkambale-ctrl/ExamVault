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

    /// <summary>Per-question breakdown - null when the assignment's ShowCorrectAnswers
    /// setting is off, so only the total score is ever exposed, never which options
    /// were right/wrong.</summary>
    public IReadOnlyList<QuestionResult>? Questions { get; init; }
}

public class QuestionResult
{
    public Guid QuestionId { get; init; }
    public string QuestionText { get; init; } = string.Empty;
    public int Marks { get; init; }
    public int MarksAwarded { get; init; }
    public Guid? SelectedOptionId { get; init; }
    public bool IsCorrect { get; init; }
    public IReadOnlyList<QuestionResultOption> Options { get; init; } = [];
}

public class QuestionResultOption
{
    public Guid OptionId { get; init; }
    public string OptionText { get; init; } = string.Empty;
    public bool IsCorrect { get; init; }
}

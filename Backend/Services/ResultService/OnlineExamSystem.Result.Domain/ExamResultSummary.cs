namespace OnlineExamSystem.Result.Domain;

public class ExamResultSummary
{
    public Guid AttemptId { get; init; }
    public Guid ExamId { get; init; }
    public string ExamTitle { get; init; } = string.Empty;
    public decimal TotalScore { get; init; }
    public int TotalMarks { get; init; }
    public int PassingMarks { get; init; }
    public bool Passed { get; init; }
    public DateTime SubmittedAtUtc { get; init; }

    /// <summary>Per-question breakdown - null when the assignment's ShowCorrectAnswers
    /// setting is off, so only the total score is ever exposed, never which options
    /// were right/wrong.</summary>
    public IReadOnlyList<QuestionResult>? Questions { get; init; }

    /// <summary>True when at least one CodeProgram answer in this attempt hasn't been
    /// manually graded yet - TotalScore still reflects a real number (that question
    /// contributes 0 until graded), but it's provisional.</summary>
    public bool HasPendingGrading { get; init; }
}

public class QuestionResult
{
    public Guid QuestionId { get; init; }
    public string QuestionText { get; init; } = string.Empty;
    public string QuestionType { get; init; } = "MultipleChoice";
    public int Marks { get; init; }
    public decimal MarksAwarded { get; init; }
    public Guid? SelectedOptionId { get; init; }
    public IReadOnlyList<Guid>? SelectedOptionIds { get; init; }
    public string? AnswerText { get; init; }
    public bool IsCorrect { get; init; }
    public bool IsPendingGrading { get; init; }
    public IReadOnlyList<QuestionResultOption> Options { get; init; } = [];
}

public class QuestionResultOption
{
    public Guid OptionId { get; init; }
    public string OptionText { get; init; } = string.Empty;
    public bool IsCorrect { get; init; }
}

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

    // Computed from this attempt's own Questions, independent of whether
    // ShowCorrectAnswers hides the per-question Questions list above - the
    // aggregate counts don't reveal which specific questions were right or
    // wrong, so they're always safe to expose. No Rank/Percentile here (see
    // ExamRankingCalculator's own doc comment for why that's Admin-report
    // only for now).
    public int CorrectCount { get; init; }
    public int IncorrectCount { get; init; }
    public int SkippedCount { get; init; }
    public double Accuracy { get; init; }

    // Null when this attempt isn't the student's own latest submitted
    // attempt on the exam (an old, superseded retake), or when the
    // best-effort cross-service ranking call failed - never blocks the
    // student from seeing their own score either way. See
    // GetResultHandler's own comment for how these are computed via
    // SystemTokenProvider.
    public int? Rank { get; init; }
    public double? Percentile { get; init; }
    public int? TotalParticipants { get; init; }
    public double? AverageAccuracy { get; init; }
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

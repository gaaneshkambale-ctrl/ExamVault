namespace OnlineExamSystem.Submission.Application.Interfaces;

public record ExamLookupResult(Guid Id, string Status, int MaxAttempts, DateTime? StartAtUtc, DateTime? EndAtUtc);

public record SectionLookupResult(
    Guid Id,
    string Name,
    int DisplayOrder,
    int DurationMinutes,
    string NavigationType,
    bool NegativeMarkingEnabled,
    decimal NegativeMarks,
    bool ShuffleQuestions,
    bool ShuffleOptions,
    bool AllowReview);

public interface IExamLookupClient
{
    Task<ExamLookupResult?> GetExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SectionLookupResult>> GetSectionsAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default);
}

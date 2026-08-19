namespace OnlineExamSystem.Result.Application.Interfaces;

public record ExamLookupResult(Guid Id, string Title, int TotalMarks, int PassingMarks, bool ShowResult = true);

public interface IExamLookupClient
{
    Task<ExamLookupResult?> GetExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default);

    /// <summary>The caller's assignment ShowCorrectAnswers setting for this exam.
    /// Defaults to true (permissive) when no assignment is found, since there is
    /// nothing restricting visibility in that case.</summary>
    Task<bool> GetShowCorrectAnswersAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default);
}

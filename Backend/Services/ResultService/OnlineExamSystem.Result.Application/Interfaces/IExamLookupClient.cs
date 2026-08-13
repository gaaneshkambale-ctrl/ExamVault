namespace OnlineExamSystem.Result.Application.Interfaces;

public record ExamLookupResult(Guid Id, string Title, int TotalMarks, int PassingMarks);

public interface IExamLookupClient
{
    Task<ExamLookupResult?> GetExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default);
}

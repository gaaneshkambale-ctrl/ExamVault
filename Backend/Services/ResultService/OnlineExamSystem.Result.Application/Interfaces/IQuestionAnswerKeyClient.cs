namespace OnlineExamSystem.Result.Application.Interfaces;

public record AnswerKeyOption(Guid OptionId, string OptionText, bool IsCorrect);

public record AnswerKeyQuestion(
    Guid QuestionId,
    string QuestionText,
    int Marks,
    IReadOnlyList<AnswerKeyOption> Options);

public interface IQuestionAnswerKeyClient
{
    Task<IReadOnlyList<AnswerKeyQuestion>> GetAnswerKeyAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default);
}

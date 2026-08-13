namespace OnlineExamSystem.Result.Application.Interfaces;

public record AnswerKeyQuestion(Guid QuestionId, int Marks, Guid? CorrectOptionId);

public interface IQuestionAnswerKeyClient
{
    Task<IReadOnlyList<AnswerKeyQuestion>> GetAnswerKeyAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default);
}

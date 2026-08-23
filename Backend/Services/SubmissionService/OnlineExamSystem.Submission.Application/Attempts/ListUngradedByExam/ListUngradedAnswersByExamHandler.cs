using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Application.Attempts.ListUngradedByExam;

public class ListUngradedAnswersByExamHandler
{
    private readonly ISubmissionRepository _repository;

    public ListUngradedAnswersByExamHandler(ISubmissionRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<UngradedAnswer>> HandleAsync(
        ListUngradedAnswersByExamQuery query,
        CancellationToken cancellationToken = default)
    {
        var attempts = await _repository.GetSubmittedAttemptsByExamIdAsync(query.ExamId, cancellationToken);
        if (attempts.Count == 0)
        {
            return [];
        }

        var answersByAttemptId = await _repository.GetAnswersByAttemptIdsAsync(
            attempts.Select(a => a.Id).ToList(),
            cancellationToken);

        return attempts
            .SelectMany(attempt => answersByAttemptId[attempt.Id]
                .Where(answer => answer.AnswerText != null && answer.MarksAwarded == null)
                .Select(answer => new UngradedAnswer(
                    answer.AttemptId,
                    answer.QuestionId,
                    attempt.UserId,
                    answer.AnswerText!,
                    answer.AnsweredAtUtc)))
            .ToList();
    }
}

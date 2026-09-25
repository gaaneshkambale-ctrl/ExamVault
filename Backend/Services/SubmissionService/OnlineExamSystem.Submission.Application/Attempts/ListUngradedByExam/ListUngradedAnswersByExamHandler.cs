using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Application.Attempts.ListUngradedByExam;

public class ListUngradedAnswersByExamHandler
{
    private readonly ISubmissionRepository _repository;
    private readonly IExamLookupClient _examLookupClient;

    public ListUngradedAnswersByExamHandler(ISubmissionRepository repository, IExamLookupClient examLookupClient)
    {
        _repository = repository;
        _examLookupClient = examLookupClient;
    }

    public async Task<IReadOnlyList<UngradedAnswer>> HandleAsync(
        ListUngradedAnswersByExamQuery query,
        CancellationToken cancellationToken = default)
    {
        // Same ownership scoping as ListAttemptsByExamHandler - an Instructor
        // grading queue for an exam they don't own returns empty, not 403.
        if (query.OwnerUserId is { } ownerUserId)
        {
            var exam = await _examLookupClient.GetExamAsync(query.ExamId, query.BearerToken, cancellationToken);
            if (exam is null || exam.CreatedByUserId != ownerUserId)
            {
                return [];
            }
        }

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

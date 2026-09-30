using OnlineExamSystem.Submission.Application.Attempts.ListByExam;
using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Application.Attempts.ListLiveByExam;

public class ListLiveAttemptsByExamHandler
{
    private readonly ISubmissionRepository _repository;
    private readonly IExamLookupClient _examLookupClient;

    public ListLiveAttemptsByExamHandler(ISubmissionRepository repository, IExamLookupClient examLookupClient)
    {
        _repository = repository;
        _examLookupClient = examLookupClient;
    }

    public async Task<IReadOnlyList<AttemptWithAnswers>> HandleAsync(
        ListLiveAttemptsByExamQuery query,
        CancellationToken cancellationToken = default)
    {
        // See ListAttemptsByExamHandler's own comment - same ownership scope.
        if (query.OwnerUserId is { } ownerUserId)
        {
            var exam = await _examLookupClient.GetExamAsync(query.ExamId, query.BearerToken, cancellationToken);
            if (exam is null || exam.CreatedByUserId != ownerUserId)
            {
                return [];
            }
        }

        var attempts = await _repository.GetAllAttemptsByExamIdAsync(query.ExamId, cancellationToken);
        if (attempts.Count == 0)
        {
            return [];
        }

        var answersByAttemptId = await _repository.GetAnswersByAttemptIdsAsync(
            attempts.Select(a => a.Id).ToList(),
            cancellationToken);

        return attempts
            .Select(attempt => new AttemptWithAnswers(attempt, answersByAttemptId[attempt.Id].ToList()))
            .ToList();
    }
}

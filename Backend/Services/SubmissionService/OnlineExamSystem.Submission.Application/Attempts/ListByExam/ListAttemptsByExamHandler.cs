using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Application.Attempts.ListByExam;

public class ListAttemptsByExamHandler
{
    private readonly ISubmissionRepository _repository;
    private readonly IExamLookupClient _examLookupClient;

    public ListAttemptsByExamHandler(ISubmissionRepository repository, IExamLookupClient examLookupClient)
    {
        _repository = repository;
        _examLookupClient = examLookupClient;
    }

    public async Task<IReadOnlyList<AttemptWithAnswers>> HandleAsync(
        ListAttemptsByExamQuery query,
        CancellationToken cancellationToken = default)
    {
        // Instructor is restricted to attempts on exams they created
        // themselves - an exam outside scope returns an empty list here,
        // same "not visible" treatment used across Exams/Assignments'
        // OwnedOnly scope, rather than a distinct 403. This closes a real
        // gap: this endpoint already allowed the Instructor role with no
        // ownership check at all, so any instructor could view any other
        // exam's student attempts/answers just by knowing its examId.
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
            .Select(attempt => new AttemptWithAnswers(attempt, answersByAttemptId[attempt.Id].ToList()))
            .ToList();
    }
}

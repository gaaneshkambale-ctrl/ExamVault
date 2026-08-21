using OnlineExamSystem.Submission.Application.Attempts.ListByExam;
using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Application.Attempts.ListLiveByExam;

public class ListLiveAttemptsByExamHandler
{
    private readonly ISubmissionRepository _repository;

    public ListLiveAttemptsByExamHandler(ISubmissionRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<AttemptWithAnswers>> HandleAsync(
        ListLiveAttemptsByExamQuery query,
        CancellationToken cancellationToken = default)
    {
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

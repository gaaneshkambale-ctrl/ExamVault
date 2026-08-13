using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Application.Attempts.Mine;

public class GetMyAttemptHandler
{
    private readonly ISubmissionRepository _repository;

    public GetMyAttemptHandler(ISubmissionRepository repository)
    {
        _repository = repository;
    }

    public async Task<GetMyAttemptResult> HandleAsync(
        GetMyAttemptQuery query,
        CancellationToken cancellationToken = default)
    {
        var attempt = await _repository.GetMostRecentAttemptAsync(query.ExamId, query.UserId, cancellationToken);
        if (attempt is null)
        {
            return GetMyAttemptResult.NotFound();
        }

        var answers = await _repository.GetAnswersByAttemptIdAsync(attempt.Id, cancellationToken);
        return GetMyAttemptResult.Found(attempt, answers);
    }
}

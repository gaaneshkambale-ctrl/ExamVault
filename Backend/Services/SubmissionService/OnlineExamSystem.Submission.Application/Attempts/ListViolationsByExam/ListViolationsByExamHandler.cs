using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Application.Attempts.ListViolationsByExam;

public class ListViolationsByExamHandler
{
    private readonly ISubmissionRepository _repository;

    public ListViolationsByExamHandler(ISubmissionRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<ViolationEventWithUser>> HandleAsync(
        ListViolationsByExamQuery query,
        CancellationToken cancellationToken = default)
    {
        var attempts = await _repository.GetAllAttemptsByExamIdAsync(query.ExamId, cancellationToken);
        if (attempts.Count == 0)
        {
            return [];
        }

        var userIdByAttemptId = attempts.ToDictionary(a => a.Id, a => a.UserId);
        var events = await _repository.GetViolationEventsByAttemptIdsAsync(
            attempts.Select(a => a.Id).ToList(),
            cancellationToken);

        return events
            .Select(e => new ViolationEventWithUser(e, userIdByAttemptId[e.AttemptId]))
            .OrderByDescending(e => e.Event.DetectedAtUtc)
            .ToList();
    }
}

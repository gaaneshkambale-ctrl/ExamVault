using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Entities;

namespace OnlineExamSystem.Submission.Application.Attempts.ListAll;

// Super Admin's platform-wide Submissions browse - every attempt across
// every tenant, not one exam's own attempts.
public class ListAllAttemptsHandler
{
    private readonly ISubmissionRepository _repository;

    public ListAllAttemptsHandler(ISubmissionRepository repository)
    {
        _repository = repository;
    }

    public Task<IReadOnlyList<ExamAttempt>> HandleAsync(
        ListAllAttemptsQuery query,
        CancellationToken cancellationToken = default) =>
        _repository.GetAllAttemptsAsync(cancellationToken);
}

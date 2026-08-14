using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Entities;

namespace OnlineExamSystem.Submission.Application.Attempts.ListByUser;

public class ListAttemptsByUserHandler
{
    private readonly ISubmissionRepository _repository;

    public ListAttemptsByUserHandler(ISubmissionRepository repository)
    {
        _repository = repository;
    }

    public Task<IReadOnlyList<ExamAttempt>> HandleAsync(
        ListAttemptsByUserQuery query,
        CancellationToken cancellationToken = default) =>
        _repository.GetAttemptsByUserIdAsync(query.UserId, cancellationToken);
}

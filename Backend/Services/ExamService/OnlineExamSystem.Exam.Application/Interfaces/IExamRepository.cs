using OnlineExamSystem.Exam.Application.Assignments;
using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Interfaces;

public interface IExamRepository
{
    Task AddAsync(ExamPaper exam, CancellationToken cancellationToken = default);
    Task<ExamPaper?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ExamPaper>> GetAllAsync(CancellationToken cancellationToken = default);
    Task RemoveAsync(ExamPaper exam, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ExamPaper>> GetAssignedPublishedExamsAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<bool> IsUserAssignedAsync(Guid examId, Guid userId, CancellationToken cancellationToken = default);

    Task AddAssignmentAsync(
        ExamAssignment assignment,
        IReadOnlyList<Guid> targetUserIds,
        CancellationToken cancellationToken = default);

    Task<ExamAssignment?> GetAssignmentByIdAsync(Guid assignmentId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Guid>> GetAssignmentTargetUserIdsAsync(
        Guid assignmentId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ExamAssignment>> GetAssignmentsForExamAsync(
        Guid examId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AssignmentWithExamTitle>> GetAllAssignmentsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>Returns true if the assignment was found and removed (its targets cascade with it).</summary>
    Task<bool> RemoveAssignmentAsync(Guid assignmentId, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}

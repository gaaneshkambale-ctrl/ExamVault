using OnlineExamSystem.Exam.Application.Assignments;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;

namespace OnlineExamSystem.Exam.Application.Tests.Fakes;

public class FakeExamRepository : IExamRepository
{
    private readonly List<ExamPaper> _exams = [];
    private readonly List<ExamAssignment> _assignments = [];
    private readonly List<ExamAssignmentTarget> _targets = [];

    public IReadOnlyList<ExamPaper> Exams => _exams;
    public IReadOnlyList<ExamAssignment> Assignments => _assignments;
    public IReadOnlyList<ExamAssignmentTarget> Targets => _targets;

    public void SeedAssignment(ExamAssignment assignment, IReadOnlyList<Guid>? targetUserIds = null)
    {
        _assignments.Add(assignment);
        foreach (var userId in targetUserIds ?? [])
        {
            _targets.Add(new ExamAssignmentTarget { ExamAssignmentId = assignment.Id, UserId = userId });
        }
    }

    public Task AddAsync(ExamPaper exam, CancellationToken cancellationToken = default)
    {
        _exams.Add(exam);
        return Task.CompletedTask;
    }

    public Task<ExamPaper?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(_exams.FirstOrDefault(e => e.Id == id));

    public Task<IReadOnlyList<ExamPaper>> GetAllAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<ExamPaper>>(_exams.OrderByDescending(e => e.CreatedAtUtc).ToList());

    public Task RemoveAsync(ExamPaper exam, CancellationToken cancellationToken = default)
    {
        _exams.RemoveAll(e => e.Id == exam.Id);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<ExamPaper>> GetAssignedPublishedExamsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var assignedExamIds = _assignments
            .Where(a => _targets.Any(t => t.ExamAssignmentId == a.Id && t.UserId == userId))
            .Select(a => a.ExamId)
            .ToHashSet();
        var result = _exams
            .Where(e => e.Status == ExamStatus.Published && assignedExamIds.Contains(e.Id))
            .OrderByDescending(e => e.CreatedAtUtc)
            .ToList();
        return Task.FromResult<IReadOnlyList<ExamPaper>>(result);
    }

    public Task<bool> IsUserAssignedAsync(Guid examId, Guid userId, CancellationToken cancellationToken = default)
    {
        var assignmentIds = _assignments.Where(a => a.ExamId == examId).Select(a => a.Id).ToHashSet();
        var isAssigned = _targets.Any(t => assignmentIds.Contains(t.ExamAssignmentId) && t.UserId == userId);
        return Task.FromResult(isAssigned);
    }

    public Task<ExamAssignment?> GetAssignmentForUserAndExamAsync(
        Guid examId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var assignmentIds = _assignments.Where(a => a.ExamId == examId).Select(a => a.Id).ToHashSet();
        var matchingAssignmentIds = _targets
            .Where(t => assignmentIds.Contains(t.ExamAssignmentId) && t.UserId == userId)
            .Select(t => t.ExamAssignmentId)
            .ToHashSet();
        var result = _assignments
            .Where(a => matchingAssignmentIds.Contains(a.Id))
            .OrderByDescending(a => a.CreatedAtUtc)
            .FirstOrDefault();
        return Task.FromResult(result);
    }

    public Task AddAssignmentAsync(
        ExamAssignment assignment,
        IReadOnlyList<Guid> targetUserIds,
        CancellationToken cancellationToken = default)
    {
        assignment.AssignmentNumber = _assignments.Count + 1;
        _assignments.Add(assignment);
        foreach (var userId in targetUserIds)
        {
            _targets.Add(new ExamAssignmentTarget { ExamAssignmentId = assignment.Id, UserId = userId });
        }

        return Task.CompletedTask;
    }

    public Task<ExamAssignment?> GetAssignmentByIdAsync(Guid assignmentId, CancellationToken cancellationToken = default) =>
        Task.FromResult(_assignments.FirstOrDefault(a => a.Id == assignmentId));

    public Task ReplaceAssignmentTargetsAsync(
        Guid assignmentId,
        IReadOnlyList<Guid> targetUserIds,
        CancellationToken cancellationToken = default)
    {
        _targets.RemoveAll(t => t.ExamAssignmentId == assignmentId);
        foreach (var userId in targetUserIds)
        {
            _targets.Add(new ExamAssignmentTarget { ExamAssignmentId = assignmentId, UserId = userId });
        }

        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<Guid>> GetAssignmentTargetUserIdsAsync(
        Guid assignmentId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Guid>>(
            _targets.Where(t => t.ExamAssignmentId == assignmentId).Select(t => t.UserId).ToList());

    public Task<IReadOnlyList<ExamAssignment>> GetAssignmentsForExamAsync(
        Guid examId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<ExamAssignment>>(
            _assignments.Where(a => a.ExamId == examId).OrderByDescending(a => a.CreatedAtUtc).ToList());

    public Task<IReadOnlyList<AssignmentWithExamTitle>> GetAllAssignmentsAsync(
        CancellationToken cancellationToken = default)
    {
        var result = _assignments
            .OrderByDescending(a => a.CreatedAtUtc)
            .Select(a => new AssignmentWithExamTitle(
                a,
                _exams.FirstOrDefault(e => e.Id == a.ExamId)?.Title ?? string.Empty,
                _targets.Count(t => t.ExamAssignmentId == a.Id)))
            .ToList();
        return Task.FromResult<IReadOnlyList<AssignmentWithExamTitle>>(result);
    }

    public Task<bool> RemoveAssignmentAsync(Guid assignmentId, CancellationToken cancellationToken = default)
    {
        var removed = _assignments.RemoveAll(a => a.Id == assignmentId) > 0;
        if (removed)
        {
            _targets.RemoveAll(t => t.ExamAssignmentId == assignmentId);
        }

        return Task.FromResult(removed);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}

using OnlineExamSystem.Exam.Application.Assignments;
using OnlineExamSystem.Exam.Application.Sections;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;

namespace OnlineExamSystem.Exam.Application.Interfaces;

public interface IExamRepository
{
    Task AddAsync(ExamPaper exam, CancellationToken cancellationToken = default);
    Task<ExamPaper?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ExamPaper>> GetAllAsync(CancellationToken cancellationToken = default);
    Task RemoveAsync(ExamPaper exam, CancellationToken cancellationToken = default);

    Task AddSectionAsync(Section section, CancellationToken cancellationToken = default);
    Task<Section?> GetSectionByIdAsync(Guid sectionId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Section>> GetSectionsByExamIdAsync(Guid examId, CancellationToken cancellationToken = default);

    /// <summary>Returns true if the section was found and removed.</summary>
    Task<bool> RemoveSectionAsync(Guid sectionId, CancellationToken cancellationToken = default);

    Task ReorderSectionsAsync(
        Guid examId,
        IReadOnlyList<SectionOrderEntry> order,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ExamPaper>> GetAssignedPublishedExamsAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<bool> IsUserAssignedAsync(Guid examId, Guid userId, CancellationToken cancellationToken = default);

    /// <summary>The caller's own assignment for this exam, or null if unassigned. Picks the most
    /// recently created one if more than one assignment targets the same user for the same exam.</summary>
    Task<ExamAssignment?> GetAssignmentForUserAndExamAsync(
        Guid examId,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task AddAssignmentAsync(
        ExamAssignment assignment,
        IReadOnlyList<Guid> targetUserIds,
        CancellationToken cancellationToken = default);

    Task<ExamAssignment?> GetAssignmentByIdAsync(Guid assignmentId, CancellationToken cancellationToken = default);

    /// <summary>Replaces every target row for this assignment with the given set of user ids.</summary>
    Task ReplaceAssignmentTargetsAsync(
        Guid assignmentId,
        IReadOnlyList<Guid> targetUserIds,
        CancellationToken cancellationToken = default);

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

    /// <summary>Assignments of Published exams whose StartAtUtc falls in (fromUtc, toUtc], with their
    /// target user ids - used by the reminder check job. Range-based rather than an exact timestamp
    /// match so it stays correct regardless of poll cadence.</summary>
    Task<IReadOnlyList<UpcomingAssignmentForReminder>> GetAssignmentsStartingWithinAsync(
        DateTime fromUtc,
        DateTime toUtc,
        CancellationToken cancellationToken = default);

    /// <summary>Of the given candidate user ids, returns only the ones that do NOT yet have an
    /// ExamReminderLog row for this assignment/window - the reminder job's idempotency check.</summary>
    Task<IReadOnlyList<Guid>> FilterUserIdsWithoutReminderLogAsync(
        Guid assignmentId,
        ReminderWindow window,
        IReadOnlyList<Guid> candidateUserIds,
        CancellationToken cancellationToken = default);

    Task AddReminderLogEntriesAsync(
        Guid assignmentId,
        ReminderWindow window,
        IReadOnlyList<Guid> userIds,
        CancellationToken cancellationToken = default);

    /// <summary>Returns the single global ReminderSettings row, creating it with both windows
    /// enabled (the pre-existing default behavior) if it doesn't exist yet.</summary>
    Task<ReminderSettings> GetOrCreateReminderSettingsAsync(CancellationToken cancellationToken = default);

    /// <summary>Returns the single global ProctoringSettings row, creating it with every
    /// detector enabled (the pre-existing default behavior) if it doesn't exist yet.</summary>
    Task<ProctoringSettings> GetOrCreateProctoringSettingsAsync(CancellationToken cancellationToken = default);

    /// <summary>Returns the single global GeneralSettings row, creating it with the
    /// entity's own defaults if it doesn't exist yet.</summary>
    Task<GeneralSettings> GetOrCreateGeneralSettingsAsync(CancellationToken cancellationToken = default);

    /// <summary>Returns the single global ExamDefaults row, creating it with the
    /// entity's own defaults if it doesn't exist yet.</summary>
    Task<ExamDefaults> GetOrCreateExamDefaultsAsync(CancellationToken cancellationToken = default);

    Task AddExamTypeAsync(ExamType examType, CancellationToken cancellationToken = default);
    Task<ExamType?> GetExamTypeByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ExamType>> GetAllExamTypesAsync(CancellationToken cancellationToken = default);

    /// <summary>Returns true if the exam type was found and removed.</summary>
    Task<bool> RemoveExamTypeAsync(Guid id, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}

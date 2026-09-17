using System.Text.Json;
using FluentValidation;
using Microsoft.Extensions.Logging;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;
using OnlineExamSystem.Shared.Events.Exam;
using OnlineExamSystem.Shared.Events.Publishing;

namespace OnlineExamSystem.Exam.Application.Assignments.Create;

public class CreateAssignmentHandler
{
    // The only keys CreateExam.tsx's Academic Details section ever writes
    // for an org type with academic-scope fields (College/University) -
    // AcademicFieldsJson can hold other org-type-specific keys too (eg.
    // examDate, testSeries) but those aren't eligibility-relevant, so they're
    // ignored here rather than compared.
    private static readonly string[] ScopeKeys = ["program", "department", "semester", "division"];
    private readonly IExamRepository _examRepository;
    private readonly IUserLookupClient _userLookupClient;
    private readonly IInternalUserLookupClient _internalUserLookupClient;
    private readonly IValidator<CreateAssignmentCommand> _validator;
    private readonly IEventPublisher _eventPublisher;
    private readonly ILogger<CreateAssignmentHandler> _logger;

    public CreateAssignmentHandler(
        IExamRepository examRepository,
        IUserLookupClient userLookupClient,
        IInternalUserLookupClient internalUserLookupClient,
        IValidator<CreateAssignmentCommand> validator,
        IEventPublisher eventPublisher,
        ILogger<CreateAssignmentHandler> logger)
    {
        _examRepository = examRepository;
        _userLookupClient = userLookupClient;
        _internalUserLookupClient = internalUserLookupClient;
        _validator = validator;
        _eventPublisher = eventPublisher;
        _logger = logger;
    }

    public async Task<CreateAssignmentResult> HandleAsync(
        CreateAssignmentCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return CreateAssignmentResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var exam = await _examRepository.GetByIdAsync(command.ExamId, cancellationToken);
        if (exam is null)
        {
            return CreateAssignmentResult.ExamNotFound();
        }

        if (command.OwnerUserId is { } ownerUserId && exam.CreatedByUserId != ownerUserId)
        {
            return CreateAssignmentResult.Forbidden();
        }

        if (exam.Status != ExamStatus.Published)
        {
            return CreateAssignmentResult.ExamNotPublished();
        }

        var targetType = Enum.Parse<AssignmentTargetType>(command.TargetType, ignoreCase: true);
        IReadOnlyList<Guid> targetUserIds;
        Guid? groupId = null;

        switch (targetType)
        {
            case AssignmentTargetType.Batch:
                var group = await _userLookupClient.GetGroupMembersAsync(
                    command.GroupId!.Value,
                    command.BearerToken,
                    cancellationToken);
                if (group is null)
                {
                    return CreateAssignmentResult.GroupNotFound();
                }
                targetUserIds = group.UserIds;
                groupId = command.GroupId;
                break;

            case AssignmentTargetType.AllStudents:
                targetUserIds = await _userLookupClient.GetAllStudentUserIdsAsync(
                    command.BearerToken,
                    cancellationToken);
                break;

            case AssignmentTargetType.Students:
            default:
                targetUserIds = command.UserIds!;
                break;
        }

        IReadOnlySet<Guid>? overriddenUserIds = null;
        var examScope = ParseScope(exam.AcademicFieldsJson);

        // Only when the exam actually opted into a scope AND that scope has
        // at least one real value - an exam with RestrictToAcademicScope=true
        // but no matching keys set (eg. an org type without Program/
        // Department/Semester fields at all) has nothing to enforce.
        if (exam.RestrictToAcademicScope && examScope.Count > 0)
        {
            var scopes = await _userLookupClient.GetStudentAcademicScopesAsync(
                targetUserIds,
                command.BearerToken,
                cancellationToken);
            var scopeByUserId = scopes.ToDictionary(s => s.UserId, s => s.AcademicFields);

            var ineligibleUserIds = targetUserIds
                .Where(id => !IsEligible(examScope, scopeByUserId.GetValueOrDefault(id)))
                .ToList();

            if (ineligibleUserIds.Count > 0)
            {
                if (!command.IsAdminCaller || !command.AllowEligibilityOverride)
                {
                    var ineligibleUsers = await _userLookupClient.GetUsersByIdsAsync(
                        ineligibleUserIds,
                        command.BearerToken,
                        cancellationToken);
                    var names = ineligibleUserIds
                        .Select(id => ineligibleUsers.FirstOrDefault(u => u.Id == id)?.FullName ?? id.ToString())
                        .ToList();

                    return CreateAssignmentResult.EligibilityRejected(DescribeScope(examScope), names);
                }

                overriddenUserIds = ineligibleUserIds.ToHashSet();
            }
        }

        var assignment = new ExamAssignment
        {
            ExamId = command.ExamId,
            TargetType = targetType,
            GroupId = groupId,
            StartAtUtc = command.StartAtUtc,
            EndAtUtc = command.EndAtUtc,
            TimeZoneId = command.TimeZoneId,
            MaxAttempts = command.MaxAttempts,
            AllowLateJoin = command.AllowLateJoin,
            GraceTimeMinutes = command.GraceTimeMinutes,
            ShowInstructions = command.ShowInstructions,
            ShowResultsAfterSubmit = command.ShowResultsAfterSubmit,
            ShowCorrectAnswers = command.ShowCorrectAnswers,
            AllowReviewAfterSubmit = command.AllowReviewAfterSubmit,
            AutoSubmitOnTimeOver = command.AutoSubmitOnTimeOver,
            EnableProctoring = command.EnableProctoring,
            EnableLiveVideo = command.EnableLiveVideo,
            CreatedByUserId = command.CreatedByUserId,
        };

        await _examRepository.AddAssignmentAsync(
            assignment,
            targetUserIds,
            overriddenUserIds,
            overriddenUserIds is { Count: > 0 } ? command.OverrideReason : null,
            cancellationToken);
        await _examRepository.SaveChangesAsync(cancellationToken);

        try
        {
            // Both the user lookup and the publish are best-effort side channels for the
            // notification, same principle as CreateUserHandler's invite email - a lookup/broker
            // hiccup must not fail an assignment that's already durably saved, nor mislead the
            // Admin into re-submitting and creating duplicates. Uses the internal, unauthenticated
            // lookup (no bearer-token dependency) rather than IUserLookupClient's admin-only
            // GET /api/users, the same client ExamReminderCheckService already uses for this.
            var targetUsers = await _internalUserLookupClient.GetUsersByIdsAsync(targetUserIds, cancellationToken);

            await _eventPublisher.PublishAsync(
                new ExamAssignedEvent
                {
                    TenantId = assignment.TenantId,
                    ExamId = exam.Id,
                    ExamTitle = exam.Title,
                    Targets = targetUsers
                        .Select(u => new AssignedUserInfo { UserId = u.Id, Email = u.Email, FullName = u.FullName })
                        .ToList(),
                    AssignedAtUtc = assignment.CreatedAtUtc,
                },
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to publish ExamAssignedEvent for assignment {AssignmentId}.", assignment.Id);
        }

        return CreateAssignmentResult.Ok(assignment, targetUserIds, exam.Title, overriddenUserIds?.Count ?? 0);
    }

    private static IReadOnlyDictionary<string, string> ParseScope(string? academicFieldsJson)
    {
        if (string.IsNullOrEmpty(academicFieldsJson))
        {
            return new Dictionary<string, string>();
        }

        var fields = JsonSerializer.Deserialize<Dictionary<string, string>>(academicFieldsJson)
            ?? new Dictionary<string, string>();

        return ScopeKeys
            .Where(key => fields.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value))
            .ToDictionary(key => key, key => fields[key].Trim(), StringComparer.OrdinalIgnoreCase);
    }

    private static bool IsEligible(
        IReadOnlyDictionary<string, string> examScope,
        IReadOnlyDictionary<string, string>? studentFields)
    {
        if (studentFields is null)
        {
            return false;
        }

        foreach (var (key, examValue) in examScope)
        {
            if (!studentFields.TryGetValue(key, out var studentValue) ||
                !string.Equals(studentValue.Trim(), examValue, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
        }

        return true;
    }

    private static string DescribeScope(IReadOnlyDictionary<string, string> examScope) =>
        string.Join(" / ", ScopeKeys.Where(examScope.ContainsKey).Select(key => examScope[key]));
}

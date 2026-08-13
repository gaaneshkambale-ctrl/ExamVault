using FluentValidation;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;
using OnlineExamSystem.Shared.Events.Exam;
using OnlineExamSystem.Shared.Events.Publishing;

namespace OnlineExamSystem.Exam.Application.Assignments.Create;

public class CreateAssignmentHandler
{
    private readonly IExamRepository _examRepository;
    private readonly IUserLookupClient _userLookupClient;
    private readonly IValidator<CreateAssignmentCommand> _validator;
    private readonly IEventPublisher _eventPublisher;

    public CreateAssignmentHandler(
        IExamRepository examRepository,
        IUserLookupClient userLookupClient,
        IValidator<CreateAssignmentCommand> validator,
        IEventPublisher eventPublisher)
    {
        _examRepository = examRepository;
        _userLookupClient = userLookupClient;
        _validator = validator;
        _eventPublisher = eventPublisher;
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
        };

        await _examRepository.AddAssignmentAsync(assignment, targetUserIds, cancellationToken);
        await _examRepository.SaveChangesAsync(cancellationToken);

        var targetUsers = await _userLookupClient.GetUsersByIdsAsync(targetUserIds, command.BearerToken, cancellationToken);

        await _eventPublisher.PublishAsync(
            new ExamAssignedEvent
            {
                ExamId = exam.Id,
                ExamTitle = exam.Title,
                Targets = targetUsers
                    .Select(u => new AssignedUserInfo { UserId = u.Id, Email = u.Email, FullName = u.FullName })
                    .ToList(),
                AssignedAtUtc = assignment.CreatedAtUtc,
            },
            cancellationToken);

        return CreateAssignmentResult.Ok(assignment, targetUserIds);
    }
}

using FluentValidation;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Enums;

namespace OnlineExamSystem.Exam.Application.Assignments.Update;

public class UpdateAssignmentHandler
{
    private readonly IExamRepository _examRepository;
    private readonly IUserLookupClient _userLookupClient;
    private readonly IValidator<UpdateAssignmentCommand> _validator;

    public UpdateAssignmentHandler(
        IExamRepository examRepository,
        IUserLookupClient userLookupClient,
        IValidator<UpdateAssignmentCommand> validator)
    {
        _examRepository = examRepository;
        _userLookupClient = userLookupClient;
        _validator = validator;
    }

    public async Task<UpdateAssignmentResult> HandleAsync(
        UpdateAssignmentCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return UpdateAssignmentResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var assignment = await _examRepository.GetAssignmentByIdAsync(command.AssignmentId, cancellationToken);
        if (assignment is null)
        {
            return UpdateAssignmentResult.NotFound();
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
                    return UpdateAssignmentResult.GroupNotFound();
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

        assignment.TargetType = targetType;
        assignment.GroupId = groupId;
        assignment.StartAtUtc = command.StartAtUtc;
        assignment.EndAtUtc = command.EndAtUtc;
        assignment.TimeZoneId = command.TimeZoneId;
        assignment.MaxAttempts = command.MaxAttempts;
        assignment.AllowLateJoin = command.AllowLateJoin;
        assignment.GraceTimeMinutes = command.GraceTimeMinutes;
        assignment.ShowInstructions = command.ShowInstructions;
        assignment.ShowResultsAfterSubmit = command.ShowResultsAfterSubmit;
        assignment.ShowCorrectAnswers = command.ShowCorrectAnswers;
        assignment.AllowReviewAfterSubmit = command.AllowReviewAfterSubmit;
        assignment.AutoSubmitOnTimeOver = command.AutoSubmitOnTimeOver;
        assignment.EnableProctoring = command.EnableProctoring;

        await _examRepository.ReplaceAssignmentTargetsAsync(assignment.Id, targetUserIds, cancellationToken);
        await _examRepository.SaveChangesAsync(cancellationToken);

        return UpdateAssignmentResult.Ok(assignment, targetUserIds);
    }
}

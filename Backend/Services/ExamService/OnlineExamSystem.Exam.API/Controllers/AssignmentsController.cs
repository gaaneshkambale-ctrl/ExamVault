using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Exam.Application.Assignments;
using OnlineExamSystem.Exam.Application.Assignments.Cancel;
using OnlineExamSystem.Exam.Application.Assignments.Create;
using OnlineExamSystem.Exam.Application.Assignments.Delete;
using OnlineExamSystem.Exam.Application.Assignments.GetById;
using OnlineExamSystem.Exam.Application.Assignments.List;
using OnlineExamSystem.Exam.Application.Assignments.Mine;
using OnlineExamSystem.Exam.Application.Assignments.Update;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Shared.Contracts.Requests.Exam;
using OnlineExamSystem.Shared.Contracts.Responses.Exam;
using static OnlineExamSystem.Exam.API.Authorization.FeaturePolicies;
using static OnlineExamSystem.Exam.API.Authorization.PermissionPolicies;

namespace OnlineExamSystem.Exam.API.Controllers;

[ApiController]
[Route("api/assignments")]
[Authorize]
public class AssignmentsController : ControllerBase
{
    private readonly CreateAssignmentHandler _createAssignmentHandler;
    private readonly UpdateAssignmentHandler _updateAssignmentHandler;
    private readonly ListAllAssignmentsHandler _listAllAssignmentsHandler;
    private readonly ListAssignmentsForExamHandler _listAssignmentsForExamHandler;
    private readonly GetAssignmentHandler _getAssignmentHandler;
    private readonly DeleteAssignmentHandler _deleteAssignmentHandler;
    private readonly CancelAssignmentHandler _cancelAssignmentHandler;
    private readonly GetMyAssignmentForExamHandler _getMyAssignmentForExamHandler;
    private readonly IAuditClient _auditClient;
    private readonly ILogger<AssignmentsController> _logger;

    public AssignmentsController(
        CreateAssignmentHandler createAssignmentHandler,
        UpdateAssignmentHandler updateAssignmentHandler,
        ListAllAssignmentsHandler listAllAssignmentsHandler,
        ListAssignmentsForExamHandler listAssignmentsForExamHandler,
        GetAssignmentHandler getAssignmentHandler,
        DeleteAssignmentHandler deleteAssignmentHandler,
        CancelAssignmentHandler cancelAssignmentHandler,
        GetMyAssignmentForExamHandler getMyAssignmentForExamHandler,
        IAuditClient auditClient,
        ILogger<AssignmentsController> logger)
    {
        _createAssignmentHandler = createAssignmentHandler;
        _updateAssignmentHandler = updateAssignmentHandler;
        _listAllAssignmentsHandler = listAllAssignmentsHandler;
        _listAssignmentsForExamHandler = listAssignmentsForExamHandler;
        _getAssignmentHandler = getAssignmentHandler;
        _deleteAssignmentHandler = deleteAssignmentHandler;
        _cancelAssignmentHandler = cancelAssignmentHandler;
        _getMyAssignmentForExamHandler = getMyAssignmentForExamHandler;
        _auditClient = auditClient;
        _logger = logger;
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine([FromQuery] Guid examId, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var assignment = await _getMyAssignmentForExamHandler.HandleAsync(
            new GetMyAssignmentForExamQuery(examId, userId),
            cancellationToken);

        if (assignment is null)
        {
            return NotFound(new { message = "No assignment found for this exam." });
        }

        return Ok(ToMyResponse(assignment));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Instructor")]
    [Authorize(Policy = Exams)]
    [Authorize(Policy = AssignmentsManage)]
    public async Task<IActionResult> Create(CreateAssignmentRequest request, CancellationToken cancellationToken)
    {
        var authorizationHeader = Request.Headers["Authorization"].ToString();
        var bearerToken = authorizationHeader["Bearer ".Length..];
        var createdByUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var ownerUserId = User.IsInRole("Instructor") ? createdByUserId : (Guid?)null;

        var command = new CreateAssignmentCommand(
            request.ExamId,
            request.TargetType,
            request.UserIds,
            request.GroupId,
            request.StartAtUtc,
            request.EndAtUtc,
            request.TimeZoneId,
            request.MaxAttempts,
            request.AllowLateJoin,
            request.GraceTimeMinutes,
            request.ShowInstructions,
            request.ShowResultsAfterSubmit,
            request.ShowCorrectAnswers,
            request.AllowReviewAfterSubmit,
            request.AutoSubmitOnTimeOver,
            request.EnableProctoring,
            request.EnableLiveVideo,
            bearerToken,
            createdByUserId,
            ownerUserId);

        var result = await _createAssignmentHandler.HandleAsync(command, cancellationToken);

        if (result.ValidationErrors.Any())
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        if (result.IsForbidden)
        {
            return Forbid();
        }

        if (result.IsExamNotFound)
        {
            return NotFound(new { message = "Exam not found." });
        }

        if (result.IsExamNotPublished)
        {
            return Conflict(new { message = "This exam must be published before it can be assigned to students." });
        }

        if (result.IsGroupNotFound)
        {
            return NotFound(new { message = "Group not found." });
        }

        _logger.LogInformation(
            "Assignment {AssignmentNumber} created for exam {ExamId}, targeting {Count} student(s).",
            result.Assignment!.AssignmentNumber,
            request.ExamId,
            result.TargetUserIds.Count);
        await _auditClient.RecordAsync(
            result.Assignment!.TenantId,
            "Exams",
            "Assigned exam",
            $"{result.ExamTitle} -> {result.TargetUserIds.Count} student(s)",
            result.Assignment.Id.ToString(),
            createdByUserId,
            User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue(ClaimTypes.Email),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);
        return StatusCode(
            StatusCodes.Status201Created,
            ToResponse(result.Assignment!, result.TargetUserIds));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Instructor")]
    [Authorize(Policy = Exams)]
    [Authorize(Policy = AssignmentsManage)]
    public async Task<IActionResult> Update(Guid id, UpdateAssignmentRequest request, CancellationToken cancellationToken)
    {
        var authorizationHeader = Request.Headers["Authorization"].ToString();
        var bearerToken = authorizationHeader["Bearer ".Length..];
        var ownerUserId = User.IsInRole("Instructor")
            ? Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!)
            : (Guid?)null;

        var command = new UpdateAssignmentCommand(
            id,
            request.TargetType,
            request.UserIds,
            request.GroupId,
            request.StartAtUtc,
            request.EndAtUtc,
            request.TimeZoneId,
            request.MaxAttempts,
            request.AllowLateJoin,
            request.GraceTimeMinutes,
            request.ShowInstructions,
            request.ShowResultsAfterSubmit,
            request.ShowCorrectAnswers,
            request.AllowReviewAfterSubmit,
            request.AutoSubmitOnTimeOver,
            request.EnableProctoring,
            request.EnableLiveVideo,
            bearerToken,
            ownerUserId);

        var result = await _updateAssignmentHandler.HandleAsync(command, cancellationToken);

        if (result.ValidationErrors.Any())
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        if (result.IsForbidden)
        {
            return Forbid();
        }

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Assignment not found." });
        }

        if (result.IsGroupNotFound)
        {
            return NotFound(new { message = "Group not found." });
        }

        _logger.LogInformation("Assignment {AssignmentId} updated.", id);
        return Ok(ToResponse(result.Assignment!, result.TargetUserIds));
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Instructor")]
    [Authorize(Policy = Exams)]
    [Authorize(Policy = AssignmentsManage)]
    public async Task<IActionResult> List([FromQuery] Guid? examId, CancellationToken cancellationToken)
    {
        var ownerUserId = User.IsInRole("Instructor")
            ? Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!)
            : (Guid?)null;

        if (examId is { } id)
        {
            var assignments = await _listAssignmentsForExamHandler.HandleAsync(
                new ListAssignmentsForExamQuery(id, ownerUserId),
                cancellationToken);
            return Ok(assignments.Select(a => ToResponse(a.Assignment, a.TargetUserIds)));
        }

        var all = await _listAllAssignmentsHandler.HandleAsync(new ListAllAssignmentsQuery(ownerUserId), cancellationToken);
        return Ok(all.Select(ToListItemResponse));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,Instructor")]
    [Authorize(Policy = Exams)]
    [Authorize(Policy = AssignmentsManage)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var ownerUserId = User.IsInRole("Instructor")
            ? Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!)
            : (Guid?)null;

        var result = await _getAssignmentHandler.HandleAsync(new GetAssignmentQuery(id, ownerUserId), cancellationToken);
        if (result is null)
        {
            return NotFound(new { message = "Assignment not found." });
        }

        return Ok(ToResponse(result.Assignment, result.TargetUserIds));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,Instructor")]
    [Authorize(Policy = Exams)]
    [Authorize(Policy = AssignmentsManage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var ownerUserId = User.IsInRole("Instructor")
            ? Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!)
            : (Guid?)null;

        var result = await _deleteAssignmentHandler.HandleAsync(new DeleteAssignmentCommand(id, ownerUserId), cancellationToken);

        if (result.IsForbidden)
        {
            return Forbid();
        }

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Assignment not found." });
        }

        _logger.LogInformation("Assignment {AssignmentId} deleted.", id);
        return NoContent();
    }

    // Distinct from Delete: keeps the row (Delete hard-removes it and
    // cascades its targets) so the Exam Scheduled list can still show a
    // cancelled sitting rather than making it disappear.
    [HttpPost("{id:guid}/cancel")]
    [Authorize(Roles = "Admin,Instructor")]
    [Authorize(Policy = Exams)]
    [Authorize(Policy = AssignmentsManage)]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken cancellationToken)
    {
        var ownerUserId = User.IsInRole("Instructor")
            ? Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!)
            : (Guid?)null;

        var result = await _cancelAssignmentHandler.HandleAsync(new CancelAssignmentCommand(id, ownerUserId), cancellationToken);

        if (result.IsForbidden)
        {
            return Forbid();
        }

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Assignment not found." });
        }

        _logger.LogInformation("Assignment {AssignmentId} cancelled.", id);
        return NoContent();
    }

    private static ExamAssignmentResponse ToResponse(ExamAssignment assignment, IReadOnlyList<Guid> targetUserIds) =>
        new(
            assignment.Id,
            assignment.AssignmentNumber,
            assignment.ExamId,
            assignment.TargetType.ToString(),
            assignment.GroupId,
            targetUserIds,
            assignment.StartAtUtc,
            assignment.EndAtUtc,
            assignment.TimeZoneId,
            assignment.MaxAttempts,
            assignment.AllowLateJoin,
            assignment.GraceTimeMinutes,
            assignment.ShowInstructions,
            assignment.ShowResultsAfterSubmit,
            assignment.ShowCorrectAnswers,
            assignment.AllowReviewAfterSubmit,
            assignment.AutoSubmitOnTimeOver,
            assignment.EnableProctoring,
            assignment.EnableLiveVideo,
            assignment.CreatedAtUtc,
            assignment.CancelledAtUtc,
            assignment.CreatedByUserId);

    private static MyAssignmentResponse ToMyResponse(ExamAssignment assignment) =>
        new(
            assignment.Id,
            assignment.ExamId,
            assignment.StartAtUtc,
            assignment.EndAtUtc,
            assignment.TimeZoneId,
            assignment.MaxAttempts,
            assignment.AllowLateJoin,
            assignment.GraceTimeMinutes,
            assignment.ShowInstructions,
            assignment.ShowResultsAfterSubmit,
            assignment.ShowCorrectAnswers,
            assignment.AllowReviewAfterSubmit,
            assignment.AutoSubmitOnTimeOver,
            assignment.EnableProctoring,
            assignment.EnableLiveVideo);

    private static AssignmentListItemResponse ToListItemResponse(AssignmentWithExamTitle item) =>
        new(
            item.Assignment.Id,
            item.Assignment.AssignmentNumber,
            item.Assignment.ExamId,
            item.ExamTitle,
            item.Assignment.TargetType.ToString(),
            item.Assignment.GroupId,
            item.TargetCount,
            item.Assignment.StartAtUtc,
            item.Assignment.EndAtUtc,
            item.Assignment.CreatedAtUtc,
            item.Assignment.CancelledAtUtc);
}

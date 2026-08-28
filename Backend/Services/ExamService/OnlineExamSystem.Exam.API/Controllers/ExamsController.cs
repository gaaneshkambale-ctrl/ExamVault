using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Exam.Application.Exams.ChangeStatus;
using OnlineExamSystem.Exam.Application.Exams.Create;
using OnlineExamSystem.Exam.Application.Exams.Delete;
using OnlineExamSystem.Exam.Application.Exams.GetById;
using OnlineExamSystem.Exam.Application.Exams.List;
using OnlineExamSystem.Exam.Application.Exams.Update;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;
using OnlineExamSystem.Shared.Contracts.Requests.Exam;
using OnlineExamSystem.Shared.Contracts.Responses.Exam;
using static OnlineExamSystem.Exam.API.Authorization.FeaturePolicies;

namespace OnlineExamSystem.Exam.API.Controllers;

[ApiController]
[Route("api/exams")]
[Authorize]
public class ExamsController : ControllerBase
{
    private readonly CreateExamHandler _createExamHandler;
    private readonly GetExamHandler _getExamHandler;
    private readonly ListExamsHandler _listExamsHandler;
    private readonly UpdateExamHandler _updateExamHandler;
    private readonly ChangeExamStatusHandler _changeExamStatusHandler;
    private readonly DeleteExamHandler _deleteExamHandler;
    private readonly IAuditClient _auditClient;
    private readonly ILogger<ExamsController> _logger;

    public ExamsController(
        CreateExamHandler createExamHandler,
        GetExamHandler getExamHandler,
        ListExamsHandler listExamsHandler,
        UpdateExamHandler updateExamHandler,
        ChangeExamStatusHandler changeExamStatusHandler,
        DeleteExamHandler deleteExamHandler,
        IAuditClient auditClient,
        ILogger<ExamsController> logger)
    {
        _createExamHandler = createExamHandler;
        _getExamHandler = getExamHandler;
        _listExamsHandler = listExamsHandler;
        _updateExamHandler = updateExamHandler;
        _changeExamStatusHandler = changeExamStatusHandler;
        _deleteExamHandler = deleteExamHandler;
        _auditClient = auditClient;
        _logger = logger;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [Authorize(Policy = Exams)]
    public async Task<IActionResult> Create(CreateExamRequest request, CancellationToken cancellationToken)
    {
        var createdByUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var command = new CreateExamCommand(
            request.Title,
            request.Description,
            request.Category,
            request.ContainsSections,
            request.CreationMethod,
            request.DurationMinutes,
            request.TotalMarks,
            request.PassingMarks,
            request.Instructions,
            createdByUserId,
            request.ExamCode,
            request.ExamTypeId,
            request.Tags);

        var result = await _createExamHandler.HandleAsync(command, cancellationToken);

        if (!result.Success)
        {
            _logger.LogWarning(
                "Create exam validation failed for {Title}: {Errors}",
                request.Title,
                string.Join("; ", result.ValidationErrors));
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        var exam = result.Exam!;
        _logger.LogInformation("Exam {ExamId} created by {UserId}.", exam.Id, createdByUserId);
        await _auditClient.RecordAsync(
            exam.TenantId,
            "Exams",
            "Created exam",
            exam.Title,
            exam.Id.ToString(),
            createdByUserId,
            User.FindFirstValue(ClaimTypes.Email),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ToResponse(exam));
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var callerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        // SuperAdmin counts as "admin" here so the Reports console can list
        // exams across every tenant - GetAllAsync's own EF query filter
        // (IsSuperAdmin bypass) is what actually scopes the result, this
        // flag only decides which repository method gets called.
        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");

        var exams = await _listExamsHandler.HandleAsync(new ListExamsQuery(callerId, isAdmin), cancellationToken);
        return Ok(exams.Select(ToResponse));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var callerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var isAdmin = User.IsInRole("Admin");

        var exam = await _getExamHandler.HandleAsync(new GetExamQuery(id, callerId, isAdmin), cancellationToken);
        if (exam is null)
        {
            return NotFound(new { message = "Exam not found." });
        }

        return Ok(ToResponse(exam));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [Authorize(Policy = Exams)]
    public async Task<IActionResult> Update(Guid id, UpdateExamRequest request, CancellationToken cancellationToken)
    {
        var command = new UpdateExamCommand(
            id,
            request.Title,
            request.Description,
            request.CreationMethod,
            request.DurationMinutes,
            request.TotalMarks,
            request.PassingMarks,
            request.Instructions,
            request.ShuffleQuestions,
            request.ShuffleOptions,
            request.ShowResult,
            request.ShowCorrectAnswers,
            request.AllowReview,
            request.StartAtUtc,
            request.EndAtUtc,
            request.MaxAttempts,
            request.NegativeMarkingEnabled,
            request.NegativeMarks,
            request.ShowSectionSummaryToStudents,
            request.AllowCalculator,
            request.AllowNotes,
            request.AutoSubmitOnTimeEnd,
            request.ConfirmBeforeSubmit,
            request.ExamCode,
            request.ExamTypeId);

        var result = await _updateExamHandler.HandleAsync(command, cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Exam not found." });
        }

        if (!result.Success)
        {
            _logger.LogWarning(
                "Update exam validation failed for {ExamId}: {Errors}",
                id,
                string.Join("; ", result.ValidationErrors));
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        _logger.LogInformation("Exam {ExamId} updated.", id);
        return Ok(ToResponse(result.Exam!));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [Authorize(Policy = Exams)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _deleteExamHandler.HandleAsync(new DeleteExamCommand(id), cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Exam not found." });
        }

        _logger.LogInformation("Exam {ExamId} deleted.", id);
        return NoContent();
    }

    [HttpPost("{id:guid}/publish")]
    [Authorize(Roles = "Admin")]
    [Authorize(Policy = Exams)]
    public Task<IActionResult> Publish(Guid id, CancellationToken cancellationToken) =>
        ChangeStatus(id, ExamStatus.Published, cancellationToken);

    [HttpPost("{id:guid}/unpublish")]
    [Authorize(Roles = "Admin")]
    [Authorize(Policy = Exams)]
    public Task<IActionResult> Unpublish(Guid id, CancellationToken cancellationToken) =>
        ChangeStatus(id, ExamStatus.Draft, cancellationToken);

    [HttpPost("{id:guid}/archive")]
    [Authorize(Roles = "Admin")]
    [Authorize(Policy = Exams)]
    public Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken) =>
        ChangeStatus(id, ExamStatus.Archived, cancellationToken);

    private async Task<IActionResult> ChangeStatus(
        Guid id,
        ExamStatus targetStatus,
        CancellationToken cancellationToken)
    {
        var result = await _changeExamStatusHandler.HandleAsync(
            new ChangeExamStatusCommand(id, targetStatus),
            cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Exam not found." });
        }

        if (result.InvalidTransition)
        {
            return Conflict(new { message = $"Exam cannot transition to {targetStatus}." });
        }

        if (result.ValidationErrors.Count > 0)
        {
            _logger.LogWarning(
                "Publish blocked for exam {ExamId}: {Errors}",
                id,
                string.Join("; ", result.ValidationErrors));
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        _logger.LogInformation("Exam {ExamId} moved to {Status}.", id, targetStatus);
        if (targetStatus == ExamStatus.Published)
        {
            await _auditClient.RecordAsync(
                result.Exam!.TenantId,
                "Exams",
                "Published exam",
                result.Exam!.Title,
                id.ToString(),
                Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!),
                User.FindFirstValue(ClaimTypes.Email),
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                cancellationToken);
        }
        return Ok(ToResponse(result.Exam!));
    }

    private static ExamResponse ToResponse(ExamPaper exam) =>
        new(
            exam.Id,
            exam.Title,
            exam.ExamCode,
            exam.Description,
            exam.Category,
            exam.ContainsSections,
            exam.CreationMethod.ToString(),
            exam.DurationMinutes,
            exam.TotalMarks,
            exam.PassingMarks,
            exam.Instructions,
            exam.Status.ToString(),
            exam.TotalQuestions,
            exam.CreatedAtUtc,
            exam.ShuffleQuestions,
            exam.ShuffleOptions,
            exam.ShowResult,
            exam.ShowCorrectAnswers,
            exam.AllowReview,
            exam.StartAtUtc,
            exam.EndAtUtc,
            exam.MaxAttempts,
            exam.NegativeMarkingEnabled,
            exam.NegativeMarks,
            exam.ShowSectionSummaryToStudents,
            exam.AllowCalculator,
            exam.AllowNotes,
            exam.AutoSubmitOnTimeEnd,
            exam.ConfirmBeforeSubmit,
            exam.ExamTypeId,
            exam.ExamType?.Name,
            exam.TenantId,
            exam.Tags);
}

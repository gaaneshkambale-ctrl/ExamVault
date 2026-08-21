using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Submission.Application.Attempts.CompleteSection;
using OnlineExamSystem.Submission.Application.Attempts.EnterSection;
using OnlineExamSystem.Submission.Application.Attempts.ForceSubmit;
using OnlineExamSystem.Submission.Application.Attempts.ListByExam;
using OnlineExamSystem.Submission.Application.Attempts.ListByUser;
using OnlineExamSystem.Submission.Application.Attempts.ListLiveByExam;
using OnlineExamSystem.Submission.Application.Attempts.Mine;
using OnlineExamSystem.Submission.Application.Attempts.RecordFullscreenExit;
using OnlineExamSystem.Submission.Application.Attempts.RecordProctoringViolation;
using OnlineExamSystem.Submission.Application.Attempts.ListViolationsByExam;
using OnlineExamSystem.Submission.Application.Attempts.SaveAnswer;
using OnlineExamSystem.Submission.Application.Attempts.Start;
using OnlineExamSystem.Submission.Application.Attempts.Submit;
using OnlineExamSystem.Submission.Application.Attempts.UpdateViolationStatus;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using OnlineExamSystem.Shared.Contracts.Requests.Submission;
using OnlineExamSystem.Shared.Contracts.Responses.Submission;

namespace OnlineExamSystem.Submission.API.Controllers;

[ApiController]
[Route("api/submissions")]
[Authorize]
public class SubmissionsController : ControllerBase
{
    private readonly StartAttemptHandler _startAttemptHandler;
    private readonly SaveAnswerHandler _saveAnswerHandler;
    private readonly SubmitAttemptHandler _submitAttemptHandler;
    private readonly ForceSubmitAttemptHandler _forceSubmitAttemptHandler;
    private readonly GetMyAttemptHandler _getMyAttemptHandler;
    private readonly ListAttemptsByExamHandler _listAttemptsByExamHandler;
    private readonly ListLiveAttemptsByExamHandler _listLiveAttemptsByExamHandler;
    private readonly ListAttemptsByUserHandler _listAttemptsByUserHandler;
    private readonly RecordFullscreenExitHandler _recordFullscreenExitHandler;
    private readonly RecordProctoringViolationHandler _recordProctoringViolationHandler;
    private readonly ListViolationsByExamHandler _listViolationsByExamHandler;
    private readonly UpdateViolationStatusHandler _updateViolationStatusHandler;
    private readonly EnterSectionHandler _enterSectionHandler;
    private readonly CompleteSectionHandler _completeSectionHandler;
    private readonly ILogger<SubmissionsController> _logger;

    public SubmissionsController(
        StartAttemptHandler startAttemptHandler,
        SaveAnswerHandler saveAnswerHandler,
        SubmitAttemptHandler submitAttemptHandler,
        ForceSubmitAttemptHandler forceSubmitAttemptHandler,
        GetMyAttemptHandler getMyAttemptHandler,
        ListAttemptsByExamHandler listAttemptsByExamHandler,
        ListLiveAttemptsByExamHandler listLiveAttemptsByExamHandler,
        ListAttemptsByUserHandler listAttemptsByUserHandler,
        RecordFullscreenExitHandler recordFullscreenExitHandler,
        RecordProctoringViolationHandler recordProctoringViolationHandler,
        ListViolationsByExamHandler listViolationsByExamHandler,
        UpdateViolationStatusHandler updateViolationStatusHandler,
        EnterSectionHandler enterSectionHandler,
        CompleteSectionHandler completeSectionHandler,
        ILogger<SubmissionsController> logger)
    {
        _startAttemptHandler = startAttemptHandler;
        _saveAnswerHandler = saveAnswerHandler;
        _submitAttemptHandler = submitAttemptHandler;
        _forceSubmitAttemptHandler = forceSubmitAttemptHandler;
        _getMyAttemptHandler = getMyAttemptHandler;
        _listAttemptsByExamHandler = listAttemptsByExamHandler;
        _listLiveAttemptsByExamHandler = listLiveAttemptsByExamHandler;
        _listAttemptsByUserHandler = listAttemptsByUserHandler;
        _recordFullscreenExitHandler = recordFullscreenExitHandler;
        _recordProctoringViolationHandler = recordProctoringViolationHandler;
        _listViolationsByExamHandler = listViolationsByExamHandler;
        _updateViolationStatusHandler = updateViolationStatusHandler;
        _enterSectionHandler = enterSectionHandler;
        _completeSectionHandler = completeSectionHandler;
        _logger = logger;
    }

    [HttpPost("start")]
    public async Task<IActionResult> Start(StartAttemptRequest request, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var authorizationHeader = Request.Headers["Authorization"].ToString();
        var bearerToken = authorizationHeader["Bearer ".Length..];

        var command = new StartAttemptCommand(request.ExamId, userId, bearerToken);
        var result = await _startAttemptHandler.HandleAsync(command, cancellationToken);

        if (!result.ValidationErrors.Any() && result.Success)
        {
            _logger.LogInformation(
                "Attempt {AttemptId} started for exam {ExamId} by {UserId}.",
                result.Attempt!.Id,
                request.ExamId,
                userId);
            return Ok(ToResponse(result.Attempt));
        }

        if (result.ValidationErrors.Any())
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        if (result.IsExamNotFound)
        {
            return NotFound(new { message = "Exam not found." });
        }

        if (result.IsOutsideSchedulingWindow)
        {
            return Conflict(new { message = "This exam is not open right now." });
        }

        if (result.IsMaxAttemptsExceeded)
        {
            return Conflict(new { message = "You have used all of your attempts for this exam." });
        }

        return Conflict(new { message = "Unable to start this exam." });
    }

    [HttpPut("{attemptId:guid}/answers")]
    public async Task<IActionResult> SaveAnswer(
        Guid attemptId,
        SaveAnswerRequest request,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var command = new SaveAnswerCommand(
            attemptId,
            request.QuestionId,
            request.SelectedOptionId,
            request.IsMarkedForReview,
            userId);
        var result = await _saveAnswerHandler.HandleAsync(command, cancellationToken);

        if (result.ValidationErrors.Any())
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        if (result.IsAttemptNotFound)
        {
            return NotFound(new { message = "Attempt not found." });
        }

        if (result.IsForbidden)
        {
            return Forbid();
        }

        if (result.IsNotInProgress)
        {
            return Conflict(new { message = "This attempt is no longer in progress." });
        }

        return Ok(ToResponse(result.Answer!));
    }

    // Best-effort proctoring signal: the student's client calls this every time it
    // detects the browser leaving fullscreen mid-attempt. Not authoritative on its
    // own (a determined student can still find ways around client-side detection),
    // but it's a real record an admin can review, not fabricated.
    [HttpPost("{attemptId:guid}/fullscreen-exit")]
    public async Task<IActionResult> RecordFullscreenExit(Guid attemptId, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var result = await _recordFullscreenExitHandler.HandleAsync(
            new RecordFullscreenExitCommand(attemptId, userId),
            cancellationToken);

        if (result.IsAttemptNotFound)
        {
            return NotFound(new { message = "Attempt not found." });
        }

        if (result.IsForbidden)
        {
            return Forbid();
        }

        if (result.IsNotInProgress)
        {
            return Conflict(new { message = "This attempt is no longer in progress." });
        }

        return Ok(new { fullscreenExitCount = result.FullscreenExitCount });
    }

    // Generic proctoring-violation sink: the exam client's face-detection/tab-monitoring
    // hook posts here with a `type` naming which counter to bump. Same best-effort,
    // client-side-detection caveat as fullscreen-exit above.
    [HttpPost("{attemptId:guid}/proctoring-violation")]
    public async Task<IActionResult> RecordProctoringViolation(
        Guid attemptId,
        RecordProctoringViolationRequest request,
        CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<ProctoringViolationType>(request.Type, ignoreCase: true, out var violationType))
        {
            return BadRequest(new { message = $"Unknown proctoring violation type '{request.Type}'." });
        }

        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var result = await _recordProctoringViolationHandler.HandleAsync(
            new RecordProctoringViolationCommand(attemptId, userId, violationType),
            cancellationToken);

        if (result.IsAttemptNotFound)
        {
            return NotFound(new { message = "Attempt not found." });
        }

        if (result.IsForbidden)
        {
            return Forbid();
        }

        if (result.IsNotInProgress)
        {
            return Conflict(new { message = "This attempt is no longer in progress." });
        }

        return Ok(new
        {
            noFaceDetectedCount = result.NoFaceDetectedCount,
            multipleFacesDetectedCount = result.MultipleFacesDetectedCount,
            tabSwitchCount = result.TabSwitchCount,
            multipleTabsCount = result.MultipleTabsCount,
            copyPasteCount = result.CopyPasteCount,
            rightClickCount = result.RightClickCount,
            multipleMonitorsCount = result.MultipleMonitorsCount,
        });
    }

    [HttpPost("{attemptId:guid}/submit")]
    public async Task<IActionResult> Submit(
        Guid attemptId,
        SubmitAttemptRequest request,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var command = new SubmitAttemptCommand(attemptId, userId, request.IsAutoSubmitted);
        var result = await _submitAttemptHandler.HandleAsync(command, cancellationToken);

        if (result.ValidationErrors.Any())
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        if (result.IsAttemptNotFound)
        {
            return NotFound(new { message = "Attempt not found." });
        }

        if (result.IsForbidden)
        {
            return Forbid();
        }

        if (result.IsAlreadySubmitted)
        {
            return Conflict(new { message = "This attempt has already been submitted." });
        }

        _logger.LogInformation(
            "Attempt {AttemptId} submitted by {UserId} (auto={IsAutoSubmitted}).",
            attemptId,
            userId,
            request.IsAutoSubmitted);
        return Ok(ToResponse(result.Attempt!));
    }

    // Live Monitoring's "End Session" - admin ends a student's attempt on
    // their behalf, same terminal state (AutoSubmitted) the exam timer
    // already produces when time runs out, just admin-initiated instead.
    [HttpPost("{attemptId:guid}/force-submit")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ForceSubmit(Guid attemptId, CancellationToken cancellationToken)
    {
        var adminUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var result = await _forceSubmitAttemptHandler.HandleAsync(
            new ForceSubmitAttemptCommand(attemptId, adminUserId),
            cancellationToken);

        if (result.IsAttemptNotFound)
        {
            return NotFound(new { message = "Attempt not found." });
        }

        if (result.IsAlreadySubmitted)
        {
            return Conflict(new { message = "This attempt has already been submitted." });
        }

        _logger.LogInformation(
            "Attempt {AttemptId} force-submitted by admin {AdminUserId}.",
            attemptId,
            adminUserId);
        return Ok(ToResponse(result.Attempt!));
    }

    [HttpPost("{attemptId:guid}/sections/{sectionId:guid}/enter")]
    public async Task<IActionResult> EnterSection(
        Guid attemptId,
        Guid sectionId,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var authorizationHeader = Request.Headers["Authorization"].ToString();
        var bearerToken = authorizationHeader["Bearer ".Length..];

        var result = await _enterSectionHandler.HandleAsync(
            new EnterSectionCommand(attemptId, sectionId, userId, bearerToken),
            cancellationToken);

        if (result.IsAttemptNotFound)
        {
            return NotFound(new { message = "Attempt not found." });
        }

        if (result.IsForbidden)
        {
            return Forbid();
        }

        if (result.IsNotInProgress)
        {
            return Conflict(new { message = "This attempt is no longer in progress." });
        }

        if (result.IsSectionNotFound)
        {
            return NotFound(new { message = "Section not found." });
        }

        if (result.IsSectionLocked)
        {
            return Conflict(new { message = "This section is locked until earlier sections are completed." });
        }

        return Ok(ToResponse(result.State!));
    }

    [HttpPost("{attemptId:guid}/sections/{sectionId:guid}/complete")]
    public async Task<IActionResult> CompleteSection(
        Guid attemptId,
        Guid sectionId,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var result = await _completeSectionHandler.HandleAsync(
            new CompleteSectionCommand(attemptId, sectionId, userId),
            cancellationToken);

        if (result.IsAttemptNotFound)
        {
            return NotFound(new { message = "Attempt not found." });
        }

        if (result.IsForbidden)
        {
            return Forbid();
        }

        if (result.IsNotInProgress)
        {
            return Conflict(new { message = "This attempt is no longer in progress." });
        }

        return Ok(ToResponse(result.State!));
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine([FromQuery] Guid examId, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var result = await _getMyAttemptHandler.HandleAsync(new GetMyAttemptQuery(examId, userId), cancellationToken);
        if (result.Attempt is null)
        {
            return NotFound(new { message = "No attempt found." });
        }

        return Ok(new AttemptWithAnswersResponse(
            ToResponse(result.Attempt),
            result.Answers.Select(ToResponse).ToList(),
            result.SectionStates.Select(ToResponse).ToList()));
    }

    [HttpGet("by-exam/{examId:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ByExam(Guid examId, CancellationToken cancellationToken)
    {
        var attempts = await _listAttemptsByExamHandler.HandleAsync(
            new ListAttemptsByExamQuery(examId),
            cancellationToken);

        return Ok(attempts
            .Select(a => new AttemptWithAnswersResponse(
                ToResponse(a.Attempt),
                a.Answers.Select(ToResponse).ToList(),
                Array.Empty<AttemptSectionStateResponse>()))
            .ToList());
    }

    // Unlike ByExam above (Reports - Submitted/AutoSubmitted only), this
    // includes InProgress attempts too - Live Monitoring's Active Exams
    // screen needs to see exams with a student currently mid-attempt.
    [HttpGet("by-exam/{examId:guid}/live")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> LiveByExam(Guid examId, CancellationToken cancellationToken)
    {
        var attempts = await _listLiveAttemptsByExamHandler.HandleAsync(
            new ListLiveAttemptsByExamQuery(examId),
            cancellationToken);

        return Ok(attempts
            .Select(a => new AttemptWithAnswersResponse(
                ToResponse(a.Attempt),
                a.Answers.Select(ToResponse).ToList(),
                Array.Empty<AttemptSectionStateResponse>()))
            .ToList());
    }

    [HttpGet("by-user/{userId:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ByUser(Guid userId, CancellationToken cancellationToken)
    {
        var attempts = await _listAttemptsByUserHandler.HandleAsync(
            new ListAttemptsByUserQuery(userId),
            cancellationToken);

        return Ok(attempts.Select(ToResponse).ToList());
    }

    // Live Monitoring's Security Violations feed - every individual
    // violation occurrence for the exam (not just the running *Count totals
    // on ExamAttempt), each with its own timestamp/severity/status.
    [HttpGet("by-exam/{examId:guid}/violations")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ViolationsByExam(Guid examId, CancellationToken cancellationToken)
    {
        var events = await _listViolationsByExamHandler.HandleAsync(
            new ListViolationsByExamQuery(examId),
            cancellationToken);

        return Ok(events.Select(e => ToResponse(e.Event, examId, e.UserId)).ToList());
    }

    [HttpPut("violations/{violationId:guid}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateViolationStatus(
        Guid violationId,
        UpdateViolationStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<ViolationStatus>(request.Status, ignoreCase: true, out var newStatus))
        {
            return BadRequest(new { message = $"Unknown violation status '{request.Status}'." });
        }

        var adminUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _updateViolationStatusHandler.HandleAsync(
            new UpdateViolationStatusCommand(violationId, newStatus, adminUserId),
            cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Violation not found." });
        }

        _logger.LogInformation(
            "Violation {ViolationId} status set to {Status} by admin {AdminUserId}.",
            violationId,
            newStatus,
            adminUserId);

        // ExamId/UserId aren't needed by the caller here (it already has
        // them from the list it clicked the action from) - reuse ToResponse
        // with Guid.Empty placeholders would be misleading, so this returns
        // a smaller ack shape instead.
        return Ok(new
        {
            id = result.Event!.Id,
            status = result.Event.Status.ToString(),
            resolvedAtUtc = result.Event.ResolvedAtUtc,
        });
    }

    private static ExamAttemptResponse ToResponse(ExamAttempt attempt) =>
        new(
            attempt.Id,
            attempt.ExamId,
            attempt.UserId,
            attempt.AttemptNumber,
            attempt.Status.ToString(),
            attempt.StartedAtUtc,
            attempt.SubmittedAtUtc,
            attempt.FullscreenExitCount,
            attempt.NoFaceDetectedCount,
            attempt.MultipleFacesDetectedCount,
            attempt.TabSwitchCount,
            attempt.MultipleTabsCount,
            attempt.CopyPasteCount,
            attempt.RightClickCount,
            attempt.MultipleMonitorsCount);

    private static ViolationEventResponse ToResponse(ViolationEvent violationEvent, Guid examId, Guid userId) =>
        new(
            violationEvent.Id,
            violationEvent.AttemptId,
            examId,
            userId,
            violationEvent.Type.ToString(),
            violationEvent.Severity.ToString(),
            violationEvent.Status.ToString(),
            violationEvent.DetectedAtUtc,
            violationEvent.ResolvedAtUtc);

    private static AttemptAnswerResponse ToResponse(AttemptAnswer answer) =>
        new(
            answer.Id,
            answer.AttemptId,
            answer.QuestionId,
            answer.SelectedOptionId,
            answer.IsMarkedForReview,
            answer.AnsweredAtUtc);

    private static AttemptSectionStateResponse ToResponse(AttemptSectionState state) =>
        new(
            state.Id,
            state.AttemptId,
            state.SectionId,
            state.EnteredAtUtc,
            state.DeadlineUtc,
            state.IsCompleted,
            state.CompletedAtUtc);
}

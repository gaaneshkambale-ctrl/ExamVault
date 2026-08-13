using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Submission.Application.Attempts.SaveAnswer;
using OnlineExamSystem.Submission.Application.Attempts.Start;
using OnlineExamSystem.Submission.Domain.Entities;
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
    private readonly ILogger<SubmissionsController> _logger;

    public SubmissionsController(
        StartAttemptHandler startAttemptHandler,
        SaveAnswerHandler saveAnswerHandler,
        ILogger<SubmissionsController> logger)
    {
        _startAttemptHandler = startAttemptHandler;
        _saveAnswerHandler = saveAnswerHandler;
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

    private static ExamAttemptResponse ToResponse(ExamAttempt attempt) =>
        new(
            attempt.Id,
            attempt.ExamId,
            attempt.UserId,
            attempt.AttemptNumber,
            attempt.Status.ToString(),
            attempt.StartedAtUtc,
            attempt.SubmittedAtUtc);

    private static AttemptAnswerResponse ToResponse(AttemptAnswer answer) =>
        new(
            answer.Id,
            answer.AttemptId,
            answer.QuestionId,
            answer.SelectedOptionId,
            answer.IsMarkedForReview,
            answer.AnsweredAtUtc);
}

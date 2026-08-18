using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Result.Application.GetExamReport;
using OnlineExamSystem.Result.Application.GetResult;
using OnlineExamSystem.Result.Domain;
using OnlineExamSystem.Shared.Contracts.Responses.Result;

namespace OnlineExamSystem.Result.API.Controllers;

[ApiController]
[Route("api/results")]
[Authorize]
public class ResultsController : ControllerBase
{
    private readonly GetResultHandler _getResultHandler;
    private readonly GetExamReportHandler _getExamReportHandler;
    private readonly ILogger<ResultsController> _logger;

    public ResultsController(
        GetResultHandler getResultHandler,
        GetExamReportHandler getExamReportHandler,
        ILogger<ResultsController> logger)
    {
        _getResultHandler = getResultHandler;
        _getExamReportHandler = getExamReportHandler;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] Guid examId, CancellationToken cancellationToken)
    {
        if (examId == Guid.Empty)
        {
            return BadRequest(new { message = "examId is required." });
        }

        var authorizationHeader = Request.Headers["Authorization"].ToString();
        var bearerToken = authorizationHeader["Bearer ".Length..];

        var result = await _getResultHandler.HandleAsync(new GetResultQuery(examId, bearerToken), cancellationToken);

        if (result.IsProviderFailure)
        {
            _logger.LogError("Result computation provider failure: {Message}", result.ProviderErrorMessage);
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = "Failed to load your result. Please try again." });
        }

        if (result.IsNotSubmitted)
        {
            return NotFound(new { message = "No submitted attempt found for this exam." });
        }

        if (result.IsExamNotFound)
        {
            return NotFound(new { message = "Exam not found." });
        }

        _logger.LogInformation(
            "Result computed for attempt {AttemptId}, exam {ExamId}: {Score}/{TotalMarks}.",
            result.Summary!.AttemptId,
            examId,
            result.Summary.TotalScore,
            result.Summary.TotalMarks);
        return Ok(ToResponse(result.Summary));
    }

    [HttpGet("by-exam/{examId:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ByExam(Guid examId, CancellationToken cancellationToken)
    {
        if (examId == Guid.Empty)
        {
            return BadRequest(new { message = "examId is required." });
        }

        var authorizationHeader = Request.Headers["Authorization"].ToString();
        var bearerToken = authorizationHeader["Bearer ".Length..];

        var result = await _getExamReportHandler.HandleAsync(
            new GetExamReportQuery(examId, bearerToken),
            cancellationToken);

        if (result.IsProviderFailure)
        {
            _logger.LogError("Exam report provider failure: {Message}", result.ProviderErrorMessage);
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = "Failed to load results for this exam. Please try again." });
        }

        if (result.IsExamNotFound)
        {
            return NotFound(new { message = "Exam not found." });
        }

        var report = result.Report!;
        return Ok(report.Attempts.Select(a => ToResponse(a, report)).ToList());
    }

    private static AdminAttemptResultResponse ToResponse(AdminAttemptResult attempt, AdminExamReport report) =>
        new(
            attempt.AttemptId,
            attempt.UserId,
            report.ExamId,
            report.ExamTitle,
            attempt.TotalScore,
            report.TotalMarks,
            report.PassingMarks,
            attempt.Passed,
            attempt.SubmittedAtUtc,
            attempt.Questions.Select(ToResponse).ToList(),
            attempt.FullscreenExitCount,
            attempt.NoFaceDetectedCount,
            attempt.MultipleFacesDetectedCount,
            attempt.TabSwitchCount,
            attempt.MultipleTabsCount,
            attempt.CopyPasteCount,
            attempt.RightClickCount);

    private static ResultSummaryResponse ToResponse(ExamResultSummary summary) =>
        new(
            summary.AttemptId,
            summary.ExamId,
            summary.ExamTitle,
            summary.TotalScore,
            summary.TotalMarks,
            summary.PassingMarks,
            summary.Passed,
            summary.SubmittedAtUtc,
            summary.Questions?.Select(ToResponse).ToList());

    private static QuestionResultResponse ToResponse(QuestionResult question) =>
        new(
            question.QuestionId,
            question.QuestionText,
            question.Marks,
            question.MarksAwarded,
            question.SelectedOptionId,
            question.IsCorrect,
            question.Options
                .Select(o => new QuestionResultOptionResponse(o.OptionId, o.OptionText, o.IsCorrect))
                .ToList());
}

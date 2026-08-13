using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    private readonly ILogger<ResultsController> _logger;

    public ResultsController(GetResultHandler getResultHandler, ILogger<ResultsController> logger)
    {
        _getResultHandler = getResultHandler;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] Guid examId, CancellationToken cancellationToken)
    {
        var authorizationHeader = Request.Headers["Authorization"].ToString();
        var bearerToken = authorizationHeader["Bearer ".Length..];

        var result = await _getResultHandler.HandleAsync(new GetResultQuery(examId, bearerToken), cancellationToken);

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

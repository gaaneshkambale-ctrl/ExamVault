using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Exam.Application.Exams.Create;
using OnlineExamSystem.Shared.Contracts.Requests.Exam;
using OnlineExamSystem.Shared.Contracts.Responses.Exam;

namespace OnlineExamSystem.Exam.API.Controllers;

[ApiController]
[Route("api/exams")]
[Authorize(Roles = "Admin")]
public class ExamsController : ControllerBase
{
    private readonly CreateExamHandler _createExamHandler;
    private readonly ILogger<ExamsController> _logger;

    public ExamsController(CreateExamHandler createExamHandler, ILogger<ExamsController> logger)
    {
        _createExamHandler = createExamHandler;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateExamRequest request, CancellationToken cancellationToken)
    {
        var createdByUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var command = new CreateExamCommand(
            request.Title,
            request.Description,
            request.ExamType,
            request.DurationMinutes,
            request.TotalMarks,
            request.PassingMarks,
            request.Instructions,
            createdByUserId);

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
        var response = new ExamResponse(
            exam.Id,
            exam.Title,
            exam.Description,
            exam.ExamType.ToString(),
            exam.DurationMinutes,
            exam.TotalMarks,
            exam.PassingMarks,
            exam.Instructions,
            exam.Status.ToString(),
            exam.TotalQuestions,
            exam.CreatedAtUtc);
        return StatusCode(StatusCodes.Status201Created, response);
    }
}

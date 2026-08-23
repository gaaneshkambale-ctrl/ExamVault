using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Exam.Application.ExamTypes.Create;
using OnlineExamSystem.Exam.Application.ExamTypes.Delete;
using OnlineExamSystem.Exam.Application.ExamTypes.List;
using OnlineExamSystem.Shared.Contracts.Requests.Exam;
using OnlineExamSystem.Shared.Contracts.Responses.Exam;

namespace OnlineExamSystem.Exam.API.Controllers;

[ApiController]
[Route("api/exam-types")]
[Authorize]
public class ExamTypesController : ControllerBase
{
    private readonly CreateExamTypeHandler _createExamTypeHandler;
    private readonly ListExamTypesHandler _listExamTypesHandler;
    private readonly DeleteExamTypeHandler _deleteExamTypeHandler;
    private readonly ILogger<ExamTypesController> _logger;

    public ExamTypesController(
        CreateExamTypeHandler createExamTypeHandler,
        ListExamTypesHandler listExamTypesHandler,
        DeleteExamTypeHandler deleteExamTypeHandler,
        ILogger<ExamTypesController> logger)
    {
        _createExamTypeHandler = createExamTypeHandler;
        _listExamTypesHandler = listExamTypesHandler;
        _deleteExamTypeHandler = deleteExamTypeHandler;
        _logger = logger;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(CreateExamTypeRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateExamTypeCommand(request.Name, request.Purpose);
        var result = await _createExamTypeHandler.HandleAsync(command, cancellationToken);

        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        _logger.LogInformation("Exam type {ExamTypeId} created.", result.ExamType!.Id);
        return StatusCode(StatusCodes.Status201Created, ToResponse(result.ExamType!));
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var examTypes = await _listExamTypesHandler.HandleAsync(cancellationToken);
        return Ok(examTypes.Select(ToResponse));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _deleteExamTypeHandler.HandleAsync(new DeleteExamTypeCommand(id), cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Exam type not found." });
        }

        _logger.LogInformation("Exam type {ExamTypeId} deleted.", id);
        return NoContent();
    }

    private static ExamTypeResponse ToResponse(Domain.Entities.ExamType examType) =>
        new(examType.Id, examType.Name, examType.Purpose, examType.CreatedAtUtc);
}

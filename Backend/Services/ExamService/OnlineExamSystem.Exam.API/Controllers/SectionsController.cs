using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Exam.Application.Sections.Create;
using OnlineExamSystem.Exam.Application.Sections.Delete;
using OnlineExamSystem.Exam.Application.Sections.GetById;
using OnlineExamSystem.Exam.Application.Sections.List;
using OnlineExamSystem.Exam.Application.Sections.Reorder;
using OnlineExamSystem.Exam.Application.Sections.Update;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Shared.Contracts.Requests.Exam;
using OnlineExamSystem.Shared.Contracts.Responses.Exam;

namespace OnlineExamSystem.Exam.API.Controllers;

[ApiController]
[Route("api/exams/{examId:guid}/sections")]
[Authorize(Roles = "Admin")]
public class SectionsController : ControllerBase
{
    private readonly CreateSectionHandler _createSectionHandler;
    private readonly UpdateSectionHandler _updateSectionHandler;
    private readonly DeleteSectionHandler _deleteSectionHandler;
    private readonly GetSectionHandler _getSectionHandler;
    private readonly ListSectionsHandler _listSectionsHandler;
    private readonly ReorderSectionsHandler _reorderSectionsHandler;
    private readonly ILogger<SectionsController> _logger;

    public SectionsController(
        CreateSectionHandler createSectionHandler,
        UpdateSectionHandler updateSectionHandler,
        DeleteSectionHandler deleteSectionHandler,
        GetSectionHandler getSectionHandler,
        ListSectionsHandler listSectionsHandler,
        ReorderSectionsHandler reorderSectionsHandler,
        ILogger<SectionsController> logger)
    {
        _createSectionHandler = createSectionHandler;
        _updateSectionHandler = updateSectionHandler;
        _deleteSectionHandler = deleteSectionHandler;
        _getSectionHandler = getSectionHandler;
        _listSectionsHandler = listSectionsHandler;
        _reorderSectionsHandler = reorderSectionsHandler;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid examId, SectionRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateSectionCommand(
            examId,
            request.Name,
            request.Description,
            request.Instructions,
            request.DisplayOrder,
            request.QuestionCount,
            request.Marks,
            request.DurationMinutes,
            request.NavigationType,
            request.NegativeMarkingEnabled,
            request.NegativeMarks,
            request.ShuffleQuestions,
            request.ShuffleOptions,
            request.AllowReview);

        var result = await _createSectionHandler.HandleAsync(command, cancellationToken);

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

        _logger.LogInformation("Section {SectionId} created for exam {ExamId}.", result.Section!.Id, examId);
        return StatusCode(StatusCodes.Status201Created, ToResponse(result.Section!));
    }

    [HttpGet]
    public async Task<IActionResult> List(Guid examId, CancellationToken cancellationToken)
    {
        var sections = await _listSectionsHandler.HandleAsync(new ListSectionsQuery(examId), cancellationToken);
        return Ok(sections.Select(ToResponse));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid examId, Guid id, CancellationToken cancellationToken)
    {
        var section = await _getSectionHandler.HandleAsync(new GetSectionQuery(id), cancellationToken);
        if (section is null || section.ExamId != examId)
        {
            return NotFound(new { message = "Section not found." });
        }

        return Ok(ToResponse(section));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid examId,
        Guid id,
        SectionRequest request,
        CancellationToken cancellationToken)
    {
        var existing = await _getSectionHandler.HandleAsync(new GetSectionQuery(id), cancellationToken);
        if (existing is null || existing.ExamId != examId)
        {
            return NotFound(new { message = "Section not found." });
        }

        var command = new UpdateSectionCommand(
            id,
            request.Name,
            request.Description,
            request.Instructions,
            request.DisplayOrder,
            request.QuestionCount,
            request.Marks,
            request.DurationMinutes,
            request.NavigationType,
            request.NegativeMarkingEnabled,
            request.NegativeMarks,
            request.ShuffleQuestions,
            request.ShuffleOptions,
            request.AllowReview);

        var result = await _updateSectionHandler.HandleAsync(command, cancellationToken);

        if (result.ValidationErrors.Any())
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Section not found." });
        }

        _logger.LogInformation("Section {SectionId} updated.", id);
        return Ok(ToResponse(result.Section!));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid examId, Guid id, CancellationToken cancellationToken)
    {
        var existing = await _getSectionHandler.HandleAsync(new GetSectionQuery(id), cancellationToken);
        if (existing is null || existing.ExamId != examId)
        {
            return NotFound(new { message = "Section not found." });
        }

        var authorizationHeader = Request.Headers["Authorization"].ToString();
        var bearerToken = authorizationHeader["Bearer ".Length..];

        await _deleteSectionHandler.HandleAsync(new DeleteSectionCommand(id, bearerToken), cancellationToken);

        _logger.LogInformation("Section {SectionId} deleted.", id);
        return NoContent();
    }

    [HttpPut("reorder")]
    public async Task<IActionResult> Reorder(
        Guid examId,
        ReorderSectionsRequest request,
        CancellationToken cancellationToken)
    {
        var order = request.Order
            .Select(o => new OnlineExamSystem.Exam.Application.Sections.SectionOrderEntry(o.SectionId, o.DisplayOrder))
            .ToList();

        await _reorderSectionsHandler.HandleAsync(new ReorderSectionsCommand(examId, order), cancellationToken);

        _logger.LogInformation("Sections reordered for exam {ExamId}.", examId);
        return NoContent();
    }

    private static SectionResponse ToResponse(Section section) =>
        new(
            section.Id,
            section.ExamId,
            section.Name,
            section.Description,
            section.Instructions,
            section.DisplayOrder,
            section.QuestionCount,
            section.Marks,
            section.DurationMinutes,
            section.NavigationType.ToString(),
            section.NegativeMarkingEnabled,
            section.NegativeMarks,
            section.ShuffleQuestions,
            section.ShuffleOptions,
            section.AllowReview,
            section.CreatedAtUtc);
}

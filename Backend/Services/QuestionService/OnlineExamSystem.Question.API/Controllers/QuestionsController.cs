using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Question.Application.Questions;
using OnlineExamSystem.Question.Application.Questions.Create;
using OnlineExamSystem.Question.Application.Questions.Delete;
using OnlineExamSystem.Question.Application.Questions.GetById;
using OnlineExamSystem.Question.Application.Questions.List;
using OnlineExamSystem.Question.Application.Questions.Update;
using OnlineExamSystem.Question.Domain.Entities;
using OnlineExamSystem.Shared.Contracts.Requests.Question;
using OnlineExamSystem.Shared.Contracts.Responses.Question;

namespace OnlineExamSystem.Question.API.Controllers;

[ApiController]
[Route("api/questions")]
[Authorize(Roles = "Admin")]
public class QuestionsController : ControllerBase
{
    private readonly CreateQuestionHandler _createQuestionHandler;
    private readonly GetQuestionHandler _getQuestionHandler;
    private readonly ListQuestionsHandler _listQuestionsHandler;
    private readonly UpdateQuestionHandler _updateQuestionHandler;
    private readonly DeleteQuestionHandler _deleteQuestionHandler;
    private readonly ILogger<QuestionsController> _logger;

    public QuestionsController(
        CreateQuestionHandler createQuestionHandler,
        GetQuestionHandler getQuestionHandler,
        ListQuestionsHandler listQuestionsHandler,
        UpdateQuestionHandler updateQuestionHandler,
        DeleteQuestionHandler deleteQuestionHandler,
        ILogger<QuestionsController> logger)
    {
        _createQuestionHandler = createQuestionHandler;
        _getQuestionHandler = getQuestionHandler;
        _listQuestionsHandler = listQuestionsHandler;
        _updateQuestionHandler = updateQuestionHandler;
        _deleteQuestionHandler = deleteQuestionHandler;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateQuestionRequest request, CancellationToken cancellationToken)
    {
        var createdByUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var command = new CreateQuestionCommand(
            request.ExamId,
            request.QuestionType,
            request.QuestionText,
            request.Marks,
            request.Difficulty,
            request.Options.Select(o => new QuestionOptionInput(o.OptionText, o.IsCorrect)).ToList(),
            createdByUserId);

        var result = await _createQuestionHandler.HandleAsync(command, cancellationToken);

        if (!result.Success)
        {
            _logger.LogWarning(
                "Create question validation failed for exam {ExamId}: {Errors}",
                request.ExamId,
                string.Join("; ", result.ValidationErrors));
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        var question = result.Question!;
        _logger.LogInformation(
            "Question {QuestionId} created for exam {ExamId} by {UserId}.",
            question.Id,
            request.ExamId,
            createdByUserId);
        return StatusCode(StatusCodes.Status201Created, ToResponse(question, result.Options));
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid examId, CancellationToken cancellationToken)
    {
        var questions = await _listQuestionsHandler.HandleAsync(new ListQuestionsQuery(examId), cancellationToken);
        return Ok(questions.Select(q => ToResponse(q.Question, q.Options)));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _getQuestionHandler.HandleAsync(new GetQuestionQuery(id), cancellationToken);
        if (result is null)
        {
            return NotFound(new { message = "Question not found." });
        }

        return Ok(ToResponse(result.Question, result.Options));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateQuestionRequest request, CancellationToken cancellationToken)
    {
        var command = new UpdateQuestionCommand(
            id,
            request.QuestionType,
            request.QuestionText,
            request.Marks,
            request.Difficulty,
            request.Options.Select(o => new QuestionOptionInput(o.OptionText, o.IsCorrect)).ToList());

        var result = await _updateQuestionHandler.HandleAsync(command, cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Question not found." });
        }

        if (!result.Success)
        {
            _logger.LogWarning(
                "Update question validation failed for {QuestionId}: {Errors}",
                id,
                string.Join("; ", result.ValidationErrors));
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        _logger.LogInformation("Question {QuestionId} updated.", id);
        return Ok(ToResponse(result.Question!, result.Options));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _deleteQuestionHandler.HandleAsync(new DeleteQuestionCommand(id), cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Question not found." });
        }

        _logger.LogInformation("Question {QuestionId} deleted.", id);
        return NoContent();
    }

    private static QuestionResponse ToResponse(ExamQuestion question, IReadOnlyList<QuestionOption> options) =>
        new(
            question.Id,
            question.ExamId,
            question.QuestionType.ToString(),
            question.QuestionText,
            question.Marks,
            question.Difficulty.ToString(),
            options
                .Select(o => new QuestionOptionResponse(o.Id, o.OptionText, o.IsCorrect, o.DisplayOrder))
                .ToList(),
            question.CreatedAtUtc);
}

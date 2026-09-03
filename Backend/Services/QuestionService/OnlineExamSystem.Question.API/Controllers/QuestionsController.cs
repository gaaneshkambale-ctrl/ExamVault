using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Question.Application.Questions;
using OnlineExamSystem.Question.Application.Questions.BulkAssignSection;
using OnlineExamSystem.Question.Application.Questions.Create;
using OnlineExamSystem.Question.Application.Questions.Delete;
using OnlineExamSystem.Question.Application.Questions.GetById;
using OnlineExamSystem.Question.Application.Questions.List;
using OnlineExamSystem.Question.Application.Questions.ListAll;
using OnlineExamSystem.Question.Application.Questions.UnassignSection;
using OnlineExamSystem.Question.Application.Questions.Update;
using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Question.Domain.Entities;
using OnlineExamSystem.Shared.Contracts.Requests.Question;
using OnlineExamSystem.Shared.Contracts.Responses.Question;
using static OnlineExamSystem.Question.API.Authorization.FeaturePolicies;
using static OnlineExamSystem.Question.API.Authorization.PermissionPolicies;

namespace OnlineExamSystem.Question.API.Controllers;

[ApiController]
[Route("api/questions")]
[Authorize]
public class QuestionsController : ControllerBase
{
    private readonly CreateQuestionHandler _createQuestionHandler;
    private readonly GetQuestionHandler _getQuestionHandler;
    private readonly ListQuestionsHandler _listQuestionsHandler;
    private readonly ListAllQuestionsHandler _listAllQuestionsHandler;
    private readonly UpdateQuestionHandler _updateQuestionHandler;
    private readonly DeleteQuestionHandler _deleteQuestionHandler;
    private readonly BulkAssignSectionHandler _bulkAssignSectionHandler;
    private readonly UnassignSectionHandler _unassignSectionHandler;
    private readonly IAuditClient _auditClient;
    private readonly ILogger<QuestionsController> _logger;

    public QuestionsController(
        CreateQuestionHandler createQuestionHandler,
        GetQuestionHandler getQuestionHandler,
        ListQuestionsHandler listQuestionsHandler,
        ListAllQuestionsHandler listAllQuestionsHandler,
        UpdateQuestionHandler updateQuestionHandler,
        DeleteQuestionHandler deleteQuestionHandler,
        BulkAssignSectionHandler bulkAssignSectionHandler,
        UnassignSectionHandler unassignSectionHandler,
        IAuditClient auditClient,
        ILogger<QuestionsController> logger)
    {
        _createQuestionHandler = createQuestionHandler;
        _getQuestionHandler = getQuestionHandler;
        _listQuestionsHandler = listQuestionsHandler;
        _listAllQuestionsHandler = listAllQuestionsHandler;
        _updateQuestionHandler = updateQuestionHandler;
        _deleteQuestionHandler = deleteQuestionHandler;
        _bulkAssignSectionHandler = bulkAssignSectionHandler;
        _unassignSectionHandler = unassignSectionHandler;
        _auditClient = auditClient;
        _logger = logger;
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Instructor")]
    [Authorize(Policy = Exams)]
    [Authorize(Policy = QuestionsCreate)]
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
            createdByUserId,
            request.ShuffleOptions,
            request.StarterCode,
            request.ProgrammingLanguage,
            request.AllowLanguageChange,
            request.SampleAnswer,
            request.FunctionName,
            request.ReturnType,
            request.Parameters?.Select(p => new QuestionParameterInput(p.Name, p.Type)).ToList(),
            request.TestCases?.Select(ToTestCaseInput).ToList(),
            request.SqlTestCases?.Select(ToSqlTestCaseInput).ToList());

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
        await _auditClient.RecordAsync(
            question.TenantId,
            "Questions",
            "Created question",
            request.QuestionText,
            question.Id.ToString(),
            createdByUserId,
            User.FindFirstValue(ClaimTypes.Email),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);
        return StatusCode(
            StatusCodes.Status201Created,
            ToResponse(question, result.Options, result.Parameters, result.TestCases, result.SqlTestCases, revealAnswers: true));
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] Guid examId,
        [FromQuery] Guid? sectionId,
        [FromQuery] bool unassignedOnly,
        CancellationToken cancellationToken)
    {
        var questions = await _listQuestionsHandler.HandleAsync(
            new ListQuestionsQuery(examId, sectionId, unassignedOnly, GetCallerOwnerUserId()),
            cancellationToken);
        return Ok(questions.Select(q =>
            ToResponse(q.Question, q.Options, q.Parameters, q.TestCases, q.SqlTestCases, RevealAnswersFor(q.Question))));
    }

    // Super Admin platform-wide Question Bank browse across every tenant's
    // exams, not one exam's own questions.
    [HttpGet("all")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> ListAll(CancellationToken cancellationToken)
    {
        var questions = await _listAllQuestionsHandler.HandleAsync(new ListAllQuestionsQuery(), cancellationToken);
        return Ok(questions.Select(q => new PlatformQuestionResponse(
            q.Id,
            q.ExamId,
            q.TenantId,
            q.QuestionType.ToString(),
            q.QuestionText,
            q.Marks,
            q.Difficulty.ToString(),
            q.CreatedAtUtc)));
    }

    [HttpPut("bulk-assign-section")]
    [Authorize(Roles = "Admin")]
    [Authorize(Policy = Exams)]
    public async Task<IActionResult> BulkAssignSection(
        BulkAssignSectionRequest request,
        CancellationToken cancellationToken)
    {
        await _bulkAssignSectionHandler.HandleAsync(
            new BulkAssignSectionCommand(request.SectionId, request.QuestionIds),
            cancellationToken);

        _logger.LogInformation(
            "{Count} question(s) assigned to section {SectionId}.",
            request.QuestionIds.Count,
            request.SectionId);
        return NoContent();
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _getQuestionHandler.HandleAsync(new GetQuestionQuery(id, GetCallerOwnerUserId()), cancellationToken);
        if (result is null)
        {
            return NotFound(new { message = "Question not found." });
        }

        return Ok(ToResponse(
            result.Question, result.Options, result.Parameters, result.TestCases, result.SqlTestCases,
            RevealAnswersFor(result.Question)));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Instructor")]
    [Authorize(Policy = Exams)]
    [Authorize(Policy = QuestionsEdit)]
    public async Task<IActionResult> Update(Guid id, UpdateQuestionRequest request, CancellationToken cancellationToken)
    {
        var command = new UpdateQuestionCommand(
            id,
            request.QuestionType,
            request.QuestionText,
            request.Marks,
            request.Difficulty,
            request.Options.Select(o => new QuestionOptionInput(o.OptionText, o.IsCorrect)).ToList(),
            request.ShuffleOptions,
            request.StarterCode,
            request.ProgrammingLanguage,
            request.AllowLanguageChange,
            request.SampleAnswer,
            request.FunctionName,
            request.ReturnType,
            request.Parameters?.Select(p => new QuestionParameterInput(p.Name, p.Type)).ToList(),
            request.TestCases?.Select(ToTestCaseInput).ToList(),
            request.SqlTestCases?.Select(ToSqlTestCaseInput).ToList(),
            GetCallerOwnerUserId());

        var result = await _updateQuestionHandler.HandleAsync(command, cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Question not found." });
        }

        if (result.IsForbidden)
        {
            return Forbid();
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
        return Ok(ToResponse(
            result.Question!, result.Options, result.Parameters, result.TestCases, result.SqlTestCases,
            revealAnswers: true));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [Authorize(Policy = Exams)]
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

    // Admin/SuperAdmin see real IsCorrect flags for every question; Instructor
    // only for questions they created themselves (ownership, not just role);
    // any other authenticated caller (a student taking an exam) gets them
    // masked so the correct answer can't be read off the network response
    // while GET /api/questions is open to any authenticated role.
    private bool RevealAnswersFor(ExamQuestion question)
    {
        if (User.IsInRole("Admin") || User.IsInRole("SuperAdmin"))
        {
            return true;
        }

        if (User.IsInRole("Instructor"))
        {
            return question.CreatedByUserId == Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }

        return false;
    }

    // Non-null only for an Instructor caller - Admin/SuperAdmin/Student pass
    // null through to the handlers for unrestricted access.
    private Guid? GetCallerOwnerUserId() =>
        User.IsInRole("Instructor") ? Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!) : null;

    private static QuestionTestCaseInput ToTestCaseInput(QuestionTestCaseRequest request) =>
        new(
            request.Arguments.Select(a => a.GetRawText()).ToList(),
            request.ExpectedOutput.GetRawText());

    private static QuestionSqlTestCaseInput ToSqlTestCaseInput(QuestionSqlTestCaseRequest request) =>
        new(request.SetupSql);

    private static QuestionResponse ToResponse(
        ExamQuestion question,
        IReadOnlyList<QuestionOption> options,
        IReadOnlyList<QuestionParameter>? parameters,
        IReadOnlyList<QuestionTestCase>? testCases,
        IReadOnlyList<QuestionSqlTestCase>? sqlTestCases,
        bool revealAnswers) =>
        new(
            question.Id,
            question.ExamId,
            question.SectionId,
            question.QuestionType.ToString(),
            question.QuestionText,
            question.Marks,
            question.Difficulty.ToString(),
            question.ShuffleOptions,
            options
                .Select(o => new QuestionOptionResponse(
                    o.Id,
                    o.OptionText,
                    revealAnswers && o.IsCorrect,
                    o.DisplayOrder))
                .ToList(),
            question.CreatedAtUtc,
            question.StarterCode,
            question.ProgrammingLanguage,
            question.AllowLanguageChange,
            revealAnswers ? question.SampleAnswer : null,
            question.FunctionName,
            question.ReturnType?.ToString(),
            parameters?.OrderBy(p => p.DisplayOrder)
                .Select(p => new QuestionParameterResponse(p.Name, p.Type.ToString(), p.DisplayOrder))
                .ToList(),
            testCases?.OrderBy(t => t.DisplayOrder)
                .Select(t => new QuestionTestCaseResponse(
                    JsonSerializer.Deserialize<List<JsonElement>>(t.ArgumentsJson)!,
                    JsonSerializer.Deserialize<JsonElement>(t.ExpectedOutputJson),
                    t.DisplayOrder))
                .ToList(),
            sqlTestCases?.OrderBy(t => t.DisplayOrder)
                .Select(t => new QuestionSqlTestCaseResponse(t.SetupSql, t.DisplayOrder))
                .ToList());
}

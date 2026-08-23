using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Question.Application.Questions.GetById;
using OnlineExamSystem.Question.Application.Questions.List;
using OnlineExamSystem.Question.Application.Questions.UnassignSection;
using OnlineExamSystem.Question.Domain.Entities;
using OnlineExamSystem.Shared.Contracts.Responses.Question;

namespace OnlineExamSystem.Question.API.Controllers;

// Deliberately routed outside /api so the Gateway's questions-route
// (/api/questions/{**catch-all}) can never proxy it - only another backend
// service calling Question API directly on its own port can reach it. See
// the Phase 8 "DECISIONS LOCKED IN" note in ActionPlan.txt.
[ApiController]
[Route("internal/questions")]
[Authorize]
public class InternalController : ControllerBase
{
    private readonly ListQuestionsHandler _listQuestionsHandler;
    private readonly GetQuestionHandler _getQuestionHandler;
    private readonly UnassignSectionHandler _unassignSectionHandler;

    public InternalController(
        ListQuestionsHandler listQuestionsHandler,
        GetQuestionHandler getQuestionHandler,
        UnassignSectionHandler unassignSectionHandler)
    {
        _listQuestionsHandler = listQuestionsHandler;
        _getQuestionHandler = getQuestionHandler;
        _unassignSectionHandler = unassignSectionHandler;
    }

    [HttpGet("answer-key")]
    public async Task<IActionResult> AnswerKey([FromQuery] Guid examId, CancellationToken cancellationToken)
    {
        var questions = await _listQuestionsHandler.HandleAsync(new ListQuestionsQuery(examId), cancellationToken);
        return Ok(questions.Select(q => ToResponse(q.Question, q.Options)));
    }

    // Called by the Execution Worker (Phase 3 auto-grading) to fetch a
    // CodeProgram question's function signature and test cases by id -
    // always fully revealed (FunctionName/ReturnType/Parameters/TestCases,
    // and SampleAnswer too) since this is service-to-service, not a student
    // or admin browser call.
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _getQuestionHandler.HandleAsync(new GetQuestionQuery(id), cancellationToken);
        if (result is null)
        {
            return NotFound(new { message = "Question not found." });
        }

        return Ok(ToFullResponse(
            result.Question, result.Options, result.Parameters, result.TestCases, result.SqlTestCases));
    }

    // Called by Exam Service when a Section is deleted, so its questions become
    // unassigned rather than being deleted themselves. Internal-only for the same
    // reason as answer-key: a student's browser never calls Question API directly.
    [HttpPut("sections/{sectionId:guid}/unassign")]
    public async Task<IActionResult> UnassignSection(Guid sectionId, CancellationToken cancellationToken)
    {
        await _unassignSectionHandler.HandleAsync(new UnassignSectionCommand(sectionId), cancellationToken);
        return NoContent();
    }

    private static QuestionResponse ToResponse(ExamQuestion question, IReadOnlyList<QuestionOption> options) =>
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
                .Select(o => new QuestionOptionResponse(o.Id, o.OptionText, o.IsCorrect, o.DisplayOrder))
                .ToList(),
            question.CreatedAtUtc);

    private static QuestionResponse ToFullResponse(
        ExamQuestion question,
        IReadOnlyList<QuestionOption> options,
        IReadOnlyList<QuestionParameter>? parameters,
        IReadOnlyList<QuestionTestCase>? testCases,
        IReadOnlyList<QuestionSqlTestCase>? sqlTestCases) =>
        ToResponse(question, options) with
        {
            StarterCode = question.StarterCode,
            ProgrammingLanguage = question.ProgrammingLanguage,
            AllowLanguageChange = question.AllowLanguageChange,
            SampleAnswer = question.SampleAnswer,
            FunctionName = question.FunctionName,
            ReturnType = question.ReturnType?.ToString(),
            Parameters = parameters?.OrderBy(p => p.DisplayOrder)
                .Select(p => new QuestionParameterResponse(p.Name, p.Type.ToString(), p.DisplayOrder))
                .ToList(),
            TestCases = testCases?.OrderBy(t => t.DisplayOrder)
                .Select(t => new QuestionTestCaseResponse(
                    JsonSerializer.Deserialize<List<JsonElement>>(t.ArgumentsJson)!,
                    JsonSerializer.Deserialize<JsonElement>(t.ExpectedOutputJson),
                    t.DisplayOrder))
                .ToList(),
            SqlTestCases = sqlTestCases?.OrderBy(t => t.DisplayOrder)
                .Select(t => new QuestionSqlTestCaseResponse(t.SetupSql, t.DisplayOrder))
                .ToList(),
        };
}

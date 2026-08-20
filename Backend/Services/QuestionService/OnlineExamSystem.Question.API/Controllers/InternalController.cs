using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    private readonly UnassignSectionHandler _unassignSectionHandler;

    public InternalController(
        ListQuestionsHandler listQuestionsHandler,
        UnassignSectionHandler unassignSectionHandler)
    {
        _listQuestionsHandler = listQuestionsHandler;
        _unassignSectionHandler = unassignSectionHandler;
    }

    [HttpGet("answer-key")]
    public async Task<IActionResult> AnswerKey([FromQuery] Guid examId, CancellationToken cancellationToken)
    {
        var questions = await _listQuestionsHandler.HandleAsync(new ListQuestionsQuery(examId), cancellationToken);
        return Ok(questions.Select(q => ToResponse(q.Question, q.Options)));
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
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Ai.Application.Generate;
using OnlineExamSystem.Shared.Contracts.Responses.Ai;
using ContractGenerateQuestionsRequest = OnlineExamSystem.Shared.Contracts.Requests.Ai.GenerateQuestionsRequest;

namespace OnlineExamSystem.Ai.API.Controllers;

[ApiController]
[Route("api/ai")]
[Authorize(Roles = "Admin")]
public class AiController : ControllerBase
{
    private readonly GenerateQuestionsHandler _generateQuestionsHandler;
    private readonly ILogger<AiController> _logger;

    public AiController(GenerateQuestionsHandler generateQuestionsHandler, ILogger<AiController> logger)
    {
        _generateQuestionsHandler = generateQuestionsHandler;
        _logger = logger;
    }

    [HttpPost("generate-questions")]
    public async Task<IActionResult> GenerateQuestions(
        ContractGenerateQuestionsRequest request,
        CancellationToken cancellationToken)
    {
        var appRequest = new GenerateQuestionsRequest(
            request.Source,
            request.ExamId,
            request.Topic,
            request.QuestionCount,
            request.QuestionTypes,
            request.DifficultyLevels,
            request.AdditionalInstructions);

        var result = await _generateQuestionsHandler.HandleAsync(appRequest, cancellationToken);

        if (result.IsProviderFailure)
        {
            _logger.LogError("AI question generation provider failure: {Message}", result.ProviderErrorMessage);
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = "Failed to generate questions. Please try again." });
        }

        if (!result.Success)
        {
            _logger.LogWarning(
                "Generate questions validation failed: {Errors}",
                string.Join("; ", result.ValidationErrors));
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        _logger.LogInformation("Generated {Count} draft questions for topic \"{Topic}\".", result.Drafts.Count, request.Topic);

        var response = result.Drafts.Select(draft => new DraftQuestionResponse(
            draft.Id,
            draft.QuestionType,
            draft.QuestionText,
            draft.Marks,
            draft.Difficulty,
            draft.Options.Select(o => new DraftQuestionOptionResponse(o.OptionText, o.IsCorrect)).ToList()));

        return Ok(response);
    }
}

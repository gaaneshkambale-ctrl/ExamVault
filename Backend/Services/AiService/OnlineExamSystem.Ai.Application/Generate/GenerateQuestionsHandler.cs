using FluentValidation;
using Microsoft.Extensions.Logging;
using OnlineExamSystem.Ai.Application.Interfaces;

namespace OnlineExamSystem.Ai.Application.Generate;

public class GenerateQuestionsHandler
{
    private readonly IAiQuestionGenerator _generator;
    private readonly IValidator<GenerateQuestionsRequest> _validator;
    private readonly ILogger<GenerateQuestionsHandler> _logger;

    public GenerateQuestionsHandler(
        IAiQuestionGenerator generator,
        IValidator<GenerateQuestionsRequest> validator,
        ILogger<GenerateQuestionsHandler> logger)
    {
        _generator = generator;
        _validator = validator;
        _logger = logger;
    }

    public async Task<GenerateQuestionsResult> HandleAsync(
        GenerateQuestionsRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return GenerateQuestionsResult.Invalid(errors);
        }

        try
        {
            var drafts = await _generator.GenerateAsync(request, cancellationToken);
            return GenerateQuestionsResult.Ok(drafts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI question generation failed for topic \"{Topic}\".", request.Topic);
            return GenerateQuestionsResult.ProviderFailure(ex.Message);
        }
    }
}

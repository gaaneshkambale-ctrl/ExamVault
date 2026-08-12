using FluentValidation;
using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Question.Domain.Entities;
using OnlineExamSystem.Question.Domain.Enums;

namespace OnlineExamSystem.Question.Application.Questions.Update;

public class UpdateQuestionHandler
{
    private readonly IQuestionRepository _questionRepository;
    private readonly IValidator<UpdateQuestionCommand> _validator;

    public UpdateQuestionHandler(IQuestionRepository questionRepository, IValidator<UpdateQuestionCommand> validator)
    {
        _questionRepository = questionRepository;
        _validator = validator;
    }

    public async Task<UpdateQuestionResult> HandleAsync(
        UpdateQuestionCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return UpdateQuestionResult.Invalid(errors);
        }

        var question = await _questionRepository.GetQuestionByIdAsync(command.QuestionId, cancellationToken);
        if (question is null)
        {
            return UpdateQuestionResult.NotFound();
        }

        question.QuestionType = Enum.Parse<QuestionType>(command.QuestionType, ignoreCase: true);
        question.QuestionText = command.QuestionText;
        question.Marks = command.Marks;
        question.Difficulty = Enum.Parse<QuestionDifficulty>(command.Difficulty, ignoreCase: true);
        question.ShuffleOptions = command.ShuffleOptions;

        await _questionRepository.RemoveOptionsByQuestionIdAsync(question.Id, cancellationToken);

        var options = command.Options
            .Select((option, index) => new QuestionOption
            {
                QuestionId = question.Id,
                OptionText = option.OptionText,
                IsCorrect = option.IsCorrect,
                DisplayOrder = index,
            })
            .ToList();
        await _questionRepository.AddOptionsAsync(options, cancellationToken);

        await _questionRepository.SaveChangesAsync(cancellationToken);

        return UpdateQuestionResult.Ok(question, options);
    }
}

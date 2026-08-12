using FluentValidation;
using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Question.Domain.Entities;
using OnlineExamSystem.Question.Domain.Enums;

namespace OnlineExamSystem.Question.Application.Questions.Create;

public class CreateQuestionHandler
{
    private readonly IQuestionRepository _questionRepository;
    private readonly IValidator<CreateQuestionCommand> _validator;

    public CreateQuestionHandler(IQuestionRepository questionRepository, IValidator<CreateQuestionCommand> validator)
    {
        _questionRepository = questionRepository;
        _validator = validator;
    }

    public async Task<CreateQuestionResult> HandleAsync(
        CreateQuestionCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return CreateQuestionResult.Invalid(errors);
        }

        var question = new ExamQuestion
        {
            ExamId = command.ExamId,
            QuestionType = Enum.Parse<QuestionType>(command.QuestionType, ignoreCase: true),
            QuestionText = command.QuestionText,
            Marks = command.Marks,
            Difficulty = Enum.Parse<QuestionDifficulty>(command.Difficulty, ignoreCase: true),
            CreatedByUserId = command.CreatedByUserId,
        };

        var options = command.Options
            .Select((option, index) => new QuestionOption
            {
                QuestionId = question.Id,
                OptionText = option.OptionText,
                IsCorrect = option.IsCorrect,
                DisplayOrder = index,
            })
            .ToList();

        await _questionRepository.AddAsync(question, options, cancellationToken);
        await _questionRepository.SaveChangesAsync(cancellationToken);

        return CreateQuestionResult.Ok(question, options);
    }
}

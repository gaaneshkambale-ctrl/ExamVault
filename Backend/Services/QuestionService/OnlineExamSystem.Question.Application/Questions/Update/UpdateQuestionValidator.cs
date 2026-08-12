using FluentValidation;
using OnlineExamSystem.Question.Domain.Enums;

namespace OnlineExamSystem.Question.Application.Questions.Update;

public class UpdateQuestionValidator : AbstractValidator<UpdateQuestionCommand>
{
    private static readonly string[] SupportedQuestionTypes = ["MultipleChoice", "TrueFalse"];

    public UpdateQuestionValidator()
    {
        RuleFor(x => x.QuestionId)
            .NotEmpty();

        RuleFor(x => x.QuestionType)
            .Must(type => SupportedQuestionTypes.Contains(type))
            .WithMessage("Only Multiple Choice and True/False questions are supported currently.");

        RuleFor(x => x.QuestionText)
            .NotEmpty()
            .MaximumLength(2000);

        RuleFor(x => x.Marks)
            .GreaterThan(0);

        RuleFor(x => x.Difficulty)
            .IsEnumName(typeof(QuestionDifficulty), caseSensitive: false);

        RuleFor(x => x.Options)
            .Must(options => options.Count(o => o.IsCorrect) == 1)
            .WithMessage("Exactly one option must be marked correct.");

        RuleFor(x => x)
            .Must(HaveValidOptionsForType)
            .WithMessage(
                "Multiple Choice questions need at least two options; " +
                "True/False questions need exactly two options: True and False.")
            .When(x => SupportedQuestionTypes.Contains(x.QuestionType));
    }

    private static bool HaveValidOptionsForType(UpdateQuestionCommand command) => command.QuestionType switch
    {
        "MultipleChoice" => command.Options.Count >= 2,
        "TrueFalse" => command.Options.Count == 2
            && command.Options.Select(o => o.OptionText).OrderBy(t => t).SequenceEqual(["False", "True"]),
        _ => true,
    };
}

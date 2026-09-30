using FluentValidation;
using OnlineExamSystem.Question.Domain.Enums;

namespace OnlineExamSystem.Question.Application.QuestionBank;

public class SaveBankQuestionValidator : AbstractValidator<SaveBankQuestionCommand>
{
    public static readonly string[] SupportedTypes = ["MultipleChoice", "MultiSelect", "TrueFalse", "CodeProgram"];

    public SaveBankQuestionValidator()
    {
        RuleFor(x => x.SubjectId).NotEmpty().WithMessage("Subject is required.");
        RuleFor(x => x.QuestionType)
            .Must(t => SupportedTypes.Contains(t))
            .WithMessage("Only Single Choice, Multiple Choice, True/False and Code/Programming questions can be added to the bank.");
        RuleFor(x => x.QuestionText).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.Explanation).MaximumLength(2000);
        RuleFor(x => x.DefaultMarks).GreaterThan(0);
        RuleFor(x => x.NegativeMarks)
            .GreaterThanOrEqualTo(0)
            .LessThanOrEqualTo(x => x.DefaultMarks)
            .WithMessage("Negative marks must be between 0 and the default marks.");
        RuleFor(x => x.Difficulty).IsEnumName(typeof(QuestionDifficulty), caseSensitive: false);
        RuleFor(x => x.Status).IsEnumName(typeof(BankQuestionStatus), caseSensitive: false);
        RuleForEach(x => x.Options)
            .Must(o => !string.IsNullOrWhiteSpace(o.Text) && o.Text.Length <= 500)
            .WithMessage("Each option needs text of at most 500 characters.");

        RuleFor(x => x.Options)
            .Must(o => o.Count >= 2).WithMessage("At least two options are required.")
            .Must(o => o.Count(x => x.IsCorrect) == 1).WithMessage("Exactly one option must be marked correct.")
            .When(x => x.QuestionType == "MultipleChoice");

        RuleFor(x => x.Options)
            .Must(o => o.Count >= 2).WithMessage("At least two options are required.")
            .Must(o => o.Count(x => x.IsCorrect) >= 2).WithMessage("At least two options must be marked correct.")
            .When(x => x.QuestionType == "MultiSelect");

        RuleFor(x => x.Options)
            .Must(o => o.Count == 2 && o.Select(x => x.Text).OrderBy(t => t).SequenceEqual(["False", "True"]))
            .WithMessage("True/False questions need exactly two options: True and False.")
            .Must(o => o.Count(x => x.IsCorrect) == 1).WithMessage("Exactly one option must be marked correct.")
            .When(x => x.QuestionType == "TrueFalse");
    }
}

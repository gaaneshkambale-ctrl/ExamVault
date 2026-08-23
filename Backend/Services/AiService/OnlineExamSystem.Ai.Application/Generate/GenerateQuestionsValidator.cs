using FluentValidation;

namespace OnlineExamSystem.Ai.Application.Generate;

public class GenerateQuestionsValidator : AbstractValidator<GenerateQuestionsRequest>
{
    private static readonly string[] SupportedSources = ["ExistingExam", "TopicText"];
    private static readonly string[] SupportedQuestionTypes = ["MultipleChoice", "MultiSelect", "TrueFalse"];
    private static readonly string[] SupportedDifficulties = ["Easy", "Medium", "Hard"];

    public GenerateQuestionsValidator()
    {
        RuleFor(x => x.Source)
            .Must(source => SupportedSources.Contains(source))
            .WithMessage("Source must be ExistingExam or TopicText.");

        RuleFor(x => x.Topic)
            .NotEmpty()
            .WithMessage("Topic is required.");

        RuleFor(x => x.QuestionCount)
            .InclusiveBetween(1, 20)
            .WithMessage("Question count must be between 1 and 20.");

        RuleFor(x => x.QuestionTypes)
            .Must(types => types.Count > 0 && types.All(SupportedQuestionTypes.Contains))
            .WithMessage("Select at least one supported question type (Single Choice, Multiple Choice, or True/False).");

        RuleFor(x => x.DifficultyLevels)
            .Must(levels => levels.Count > 0 && levels.All(SupportedDifficulties.Contains))
            .WithMessage("Select at least one difficulty level.");
    }
}

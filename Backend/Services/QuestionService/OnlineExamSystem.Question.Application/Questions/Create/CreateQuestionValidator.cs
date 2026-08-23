using FluentValidation;
using OnlineExamSystem.Question.Domain.Enums;

namespace OnlineExamSystem.Question.Application.Questions.Create;

public class CreateQuestionValidator : AbstractValidator<CreateQuestionCommand>
{
    private static readonly string[] SupportedQuestionTypes =
        ["MultipleChoice", "MultiSelect", "TrueFalse", "CodeProgram"];
    private static readonly string[] OptionBasedQuestionTypes = ["MultipleChoice", "TrueFalse"];
    private static readonly string[] SupportedProgrammingLanguages = ["CSharp", "Java", "Python", "Cpp", "JavaScript", "Sql"];

    public CreateQuestionValidator()
    {
        RuleFor(x => x.ExamId)
            .NotEmpty();

        RuleFor(x => x.QuestionType)
            .Must(type => SupportedQuestionTypes.Contains(type))
            .WithMessage(
                "Only Single Choice, Multiple Choice, True/False, and Code/Programming questions are supported currently.");

        RuleFor(x => x.QuestionText)
            .NotEmpty()
            .MaximumLength(2000);

        RuleFor(x => x.Marks)
            .GreaterThan(0);

        RuleFor(x => x.Difficulty)
            .IsEnumName(typeof(QuestionDifficulty), caseSensitive: false);

        RuleFor(x => x.Options)
            .Must(options => options.Count(o => o.IsCorrect) == 1)
            .WithMessage("Exactly one option must be marked correct.")
            .When(x => OptionBasedQuestionTypes.Contains(x.QuestionType));

        RuleFor(x => x)
            .Must(HaveValidOptionsForType)
            .WithMessage(
                "Multiple Choice questions need at least two options; " +
                "True/False questions need exactly two options: True and False.")
            .When(x => OptionBasedQuestionTypes.Contains(x.QuestionType));

        // Code/Programming questions never carry options - they're graded
        // manually from the student's submitted code, not by matching a
        // selected option.
        RuleFor(x => x.Options)
            .Empty()
            .WithMessage("Code/Programming questions don't use options.")
            .When(x => x.QuestionType == "CodeProgram");

        // MultiSelect gets its own rules, separate from OptionBasedQuestionTypes'
        // "exactly one correct" - it needs at least two, which is what actually
        // distinguishes it from Single Choice (MultipleChoice).
        RuleFor(x => x.Options)
            .Must(options => options.Count(o => o.IsCorrect) >= 2)
            .WithMessage("Multiple Choice (multi-select) questions need at least two correct options marked.")
            .When(x => x.QuestionType == "MultiSelect");

        RuleFor(x => x.Options)
            .Must(options => options.Count >= 2)
            .WithMessage("Multiple Choice (multi-select) questions need at least two options.")
            .When(x => x.QuestionType == "MultiSelect");

        RuleFor(x => x.ProgrammingLanguage)
            .Must(lang => lang != null && SupportedProgrammingLanguages.Contains(lang))
            .WithMessage("Programming Language must be one of: " + string.Join(", ", SupportedProgrammingLanguages))
            .When(x => x.QuestionType == "CodeProgram");

        // Auto-grading is opt-in: a CodeProgram question with no FunctionName stays
        // a manual-grading question exactly as before (Phase 1 of the original
        // plan) - these rules only bite once an admin starts filling in a function
        // signature.
        RuleFor(x => x.ReturnType)
            .Must(type => type != null && Enum.TryParse<ParameterType>(type, ignoreCase: true, out _))
            .WithMessage("Return Type must be one of: " + string.Join(", ", Enum.GetNames<ParameterType>()))
            .When(x => !string.IsNullOrWhiteSpace(x.FunctionName));

        RuleFor(x => x.Parameters)
            .Must(parameters => parameters is { Count: > 0 })
            .WithMessage("A function signature needs at least one parameter.")
            .When(x => !string.IsNullOrWhiteSpace(x.FunctionName));

        RuleForEach(x => x.Parameters)
            .Must(parameter => Enum.TryParse<ParameterType>(parameter.Type, ignoreCase: true, out _))
            .WithMessage("Each parameter's Type must be one of: " + string.Join(", ", Enum.GetNames<ParameterType>()))
            .When(x => x.Parameters is { Count: > 0 });

        // Test cases need a signature to attach to - can't call a function that
        // doesn't have a declared shape yet.
        RuleFor(x => x.FunctionName)
            .NotEmpty()
            .WithMessage("Test cases require a function signature (Function Name, Return Type, Parameters).")
            .When(x => x.TestCases is { Count: > 0 });

        RuleForEach(x => x.TestCases)
            .Must((command, testCase) => testCase.Arguments.Count == (command.Parameters?.Count ?? 0))
            .WithMessage("Each test case must supply exactly one argument value per parameter.")
            .When(x => x.TestCases is { Count: > 0 } && x.Parameters is { Count: > 0 });

        // Sql questions have no function signature - their auto-grading harness
        // needs a Reference Query (Sample Answer) instead, since expected rows
        // are always derived by running it, never hand-typed by the admin.
        RuleFor(x => x.SampleAnswer)
            .NotEmpty()
            .WithMessage("Sql test cases need a Reference Query (Sample Answer) to grade against.")
            .When(x => x.ProgrammingLanguage == "Sql" && x.SqlTestCases is { Count: > 0 });

        RuleForEach(x => x.SqlTestCases)
            .Must(testCase => !string.IsNullOrWhiteSpace(testCase.SetupSql))
            .WithMessage("Each Sql test case needs Setup SQL (schema + seed data).")
            .When(x => x.SqlTestCases is { Count: > 0 });
    }

    private static bool HaveValidOptionsForType(CreateQuestionCommand command) => command.QuestionType switch
    {
        "MultipleChoice" => command.Options.Count >= 2,
        "TrueFalse" => command.Options.Count == 2
            && command.Options.Select(o => o.OptionText).OrderBy(t => t).SequenceEqual(["False", "True"]),
        _ => true,
    };
}

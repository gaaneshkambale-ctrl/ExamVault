using FluentValidation;

namespace OnlineExamSystem.Execution.Application.Run;

public class RunCodeValidator : AbstractValidator<RunCodeCommand>
{
    private static readonly string[] SupportedLanguages = ["CSharp", "Java", "Python", "Cpp", "JavaScript"];

    public RunCodeValidator()
    {
        RuleFor(x => x.Language).Must(l => SupportedLanguages.Contains(l));
        RuleFor(x => x.StudentCode).NotEmpty();
        RuleFor(x => x.FunctionName).NotEmpty();
        RuleFor(x => x.Parameters).Must(p => p.Count > 0);
        RuleFor(x => x.TestCases).Must(t => t.Count > 0);
        RuleForEach(x => x.TestCases)
            .Must((command, testCase) => testCase.Arguments.Count == command.Parameters.Count)
            .WithMessage("Each test case must supply exactly one argument value per parameter.");
    }
}

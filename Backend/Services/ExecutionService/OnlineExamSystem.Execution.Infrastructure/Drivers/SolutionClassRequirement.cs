using System.Text.RegularExpressions;
using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Infrastructure.Drivers;

// Shared by every language's driver generator - each one's own driver calls
// `new Solution().{FunctionName}(...)`, so StarterCode must declare a
// "Solution" class or the generated file fails to compile in a way that
// doesn't point at the real cause (see DriverGenerationException).
internal static class SolutionClassRequirement
{
    private static readonly Regex SolutionClassPattern = new(@"\bclass\s+Solution\b", RegexOptions.Compiled);

    public static void EnsurePresent(string studentCode, string functionName, string language)
    {
        if (!SolutionClassPattern.IsMatch(studentCode))
        {
            throw new DriverGenerationException(
                $"This question's starter code must define a class named 'Solution' with a '{functionName}' method. " +
                $"A standalone {language} program with its own entry point (e.g. a 'Main' class with main()) can't be auto-graded.");
        }
    }
}

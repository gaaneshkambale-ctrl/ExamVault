using System.Text.Json;
using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Application.Interfaces;

// One implementation per supported ProgrammingLanguage (CSharp/Java/Python/
// Cpp/JavaScript). Builds the file set Piston executes for ONE test case:
// the student's own code plus a generated driver with that test case's
// argument values embedded as source-code literals (never parsed at
// run time - the values are known before the sandboxed run starts) and an
// entry point that calls the student's function and prints the result as
// compact JSON to stdout, matching how ExpectedOutput is already stored.
public interface IDriverGenerator
{
    // Matches OnlineExamSystem.Question.Domain.Enums.QuestionType's
    // ProgrammingLanguage string values: CSharp, Java, Python, Cpp, JavaScript.
    string Language { get; }
    string PistonLanguage { get; }
    string PistonVersion { get; }

    IReadOnlyList<PistonFile> BuildFiles(
        string studentCode,
        string functionName,
        IReadOnlyList<FunctionParameter> parameters,
        ParameterType returnType,
        IReadOnlyList<JsonElement> arguments);
}

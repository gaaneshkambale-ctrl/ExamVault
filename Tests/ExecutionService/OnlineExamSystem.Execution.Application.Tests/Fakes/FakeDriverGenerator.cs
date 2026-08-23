using System.Text.Json;
using OnlineExamSystem.Execution.Application.Interfaces;
using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Application.Tests.Fakes;

// Doesn't actually generate real driver code - just records what it was
// asked to build, so tests can assert RunCodeHandler wired the right
// language/arguments through without needing a real Piston sandbox.
public class FakeDriverGenerator : IDriverGenerator
{
    public string Language { get; }
    public string PistonLanguage => "fake-lang";
    public string PistonVersion => "1.0.0";

    public List<IReadOnlyList<JsonElement>> ReceivedArguments { get; } = [];

    public FakeDriverGenerator(string language = "Python")
    {
        Language = language;
    }

    public IReadOnlyList<PistonFile> BuildFiles(
        string studentCode,
        string functionName,
        IReadOnlyList<FunctionParameter> parameters,
        ParameterType returnType,
        IReadOnlyList<JsonElement> arguments)
    {
        ReceivedArguments.Add(arguments);
        return [new PistonFile("main", studentCode)];
    }
}

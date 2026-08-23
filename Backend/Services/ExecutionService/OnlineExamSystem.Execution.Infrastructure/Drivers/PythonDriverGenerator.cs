using System.Text.Json;
using OnlineExamSystem.Execution.Application.Interfaces;
using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Infrastructure.Drivers;

public class PythonDriverGenerator : IDriverGenerator
{
    public string Language => "Python";
    public string PistonLanguage => "python";
    public string PistonVersion => "3.10.0";

    public IReadOnlyList<PistonFile> BuildFiles(
        string studentCode,
        string functionName,
        IReadOnlyList<FunctionParameter> parameters,
        ParameterType returnType,
        IReadOnlyList<JsonElement> arguments)
    {
        var args = string.Join(", ", arguments.Select(PythonLiteral.Render));
        var driver = $"""

            import json as __json
            __result = {functionName}({args})
            print(__json.dumps(__result, separators=(',', ':')))
            """;

        return [new PistonFile("main.py", studentCode + "\n" + driver)];
    }
}

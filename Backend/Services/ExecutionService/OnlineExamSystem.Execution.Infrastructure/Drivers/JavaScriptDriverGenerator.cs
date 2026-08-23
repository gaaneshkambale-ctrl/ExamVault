using System.Text.Json;
using OnlineExamSystem.Execution.Application.Interfaces;
using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Infrastructure.Drivers;

public class JavaScriptDriverGenerator : IDriverGenerator
{
    public string Language => "JavaScript";
    public string PistonLanguage => "javascript";
    public string PistonVersion => "18.15.0";

    public IReadOnlyList<PistonFile> BuildFiles(
        string studentCode,
        string functionName,
        IReadOnlyList<FunctionParameter> parameters,
        ParameterType returnType,
        IReadOnlyList<JsonElement> arguments)
    {
        // JSON literal syntax is a strict subset of JS literal syntax for
        // numbers/strings/booleans/arrays - no custom renderer needed here,
        // unlike the statically-typed languages.
        var args = string.Join(",", arguments.Select(a => a.GetRawText()));
        var driver = $"\n\nconst __result = {functionName}({args});\nconsole.log(JSON.stringify(__result));\n";

        return [new PistonFile("main", studentCode + driver)];
    }
}

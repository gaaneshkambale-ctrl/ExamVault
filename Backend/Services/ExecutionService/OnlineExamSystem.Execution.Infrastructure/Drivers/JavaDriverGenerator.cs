using System.Text.Json;
using OnlineExamSystem.Execution.Application.Interfaces;
using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Infrastructure.Drivers;

public class JavaDriverGenerator : IDriverGenerator
{
    public string Language => "Java";
    public string PistonLanguage => "java";
    public string PistonVersion => "15.0.2";

    public IReadOnlyList<PistonFile> BuildFiles(
        string studentCode,
        string functionName,
        IReadOnlyList<FunctionParameter> parameters,
        ParameterType returnType,
        IReadOnlyList<JsonElement> arguments)
    {
        // Piston's Java package runs a single file via the JDK 11+ single-file
        // source launcher (`java Main.java`), which compiles in-memory and does
        // NOT support separate compilation units - a second file is never
        // compiled at all (verified against the real service, not assumed).
        // Everything has to live in one file, and the launcher requires the
        // FIRST top-level type declared to be the one with main(String[]) -
        // so Main goes first, and the student's class (always named "Solution"
        // by convention, matching coder.png) goes second, with its "public"
        // modifier stripped since only one public type is allowed per file.
        SolutionClassRequirement.EnsurePresent(studentCode, functionName, "Java");
        var solutionClass = studentCode.Replace("public class Solution", "class Solution");

        var args = string.Join(", ", arguments
            .Zip(parameters, (arg, param) => JavaLiteral.Render(arg, param.Type)));

        var printStatement = JavaLiteral.RenderPrintStatement(returnType, "__result");

        var driver = $$"""
            public class Main {
                public static void main(String[] args) {
                    Solution sol = new Solution();
                    {{JavaLiteral.TypeName(returnType)}} __result = sol.{{functionName}}({{args}});
                    {{printStatement}}
                }
            }

            {{solutionClass}}
            """;

        return [new PistonFile("Main", driver)];
    }
}

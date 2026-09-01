using System.Text.Json;
using OnlineExamSystem.Execution.Application.Interfaces;
using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Infrastructure.Drivers;

public class CSharpDriverGenerator : IDriverGenerator
{
    public string Language => "CSharp";
    public string PistonLanguage => "csharp.net";
    public string PistonVersion => "5.0.201";

    public IReadOnlyList<PistonFile> BuildFiles(
        string studentCode,
        string functionName,
        IReadOnlyList<FunctionParameter> parameters,
        ParameterType returnType,
        IReadOnlyList<JsonElement> arguments)
    {
        // Piston's dotnet package does `dotnet new console` then compiles every
        // *.cs file it finds via MSBuild - true multi-file support, verified
        // against the real service. The driver file must NOT be named
        // "Program" - that collides with dotnet's own scaffolded Program.cs
        // and the whole build fails before either file compiles.
        SolutionClassRequirement.EnsurePresent(studentCode, functionName, "C#");
        var args = string.Join(", ", arguments
            .Zip(parameters, (arg, param) => CSharpLiteral.Render(arg, param.Type)));

        var driver = $$"""
            using System;

            public class Driver
            {
                public static void Main()
                {
                    var sol = new Solution();
                    {{CSharpLiteral.TypeName(returnType)}} result = sol.{{functionName}}({{args}});
                    Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(result));
                }
            }
            """;

        return
        [
            new PistonFile("Solution", studentCode),
            new PistonFile("Driver", driver),
        ];
    }
}

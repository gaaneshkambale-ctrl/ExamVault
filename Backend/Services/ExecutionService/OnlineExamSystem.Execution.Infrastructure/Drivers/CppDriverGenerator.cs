using System.Text.Json;
using OnlineExamSystem.Execution.Application.Interfaces;
using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Infrastructure.Drivers;

public class CppDriverGenerator : IDriverGenerator
{
    public string Language => "Cpp";
    public string PistonLanguage => "c++";
    public string PistonVersion => "10.2.0";

    public IReadOnlyList<PistonFile> BuildFiles(
        string studentCode,
        string functionName,
        IReadOnlyList<FunctionParameter> parameters,
        ParameterType returnType,
        IReadOnlyList<JsonElement> arguments)
    {
        // Piston's gcc package renames every submitted file with a
        // language-specific extension and compiles the whole set together via
        // `g++ *.cpp` - true multi-file support, verified against the real
        // service. Main still needs to #include the Solution file directly
        // (its class methods are implicitly inline within the class body, so
        // this doesn't violate one-definition-rule across translation units).
        SolutionClassRequirement.EnsurePresent(studentCode, functionName, "C++");
        var args = string.Join(", ", arguments
            .Zip(parameters, (arg, param) => CppLiteral.Render(arg, param.Type)));

        var printStatement = CppLiteral.RenderPrintStatement(returnType, "result");

        var driver = $$"""
            #include <iostream>
            #include <vector>
            #include <string>
            #include "Solution.cpp"

            // No JSON library available without extra dependencies - a plain,
            // reasonably precise double formatter that avoids scientific
            // notation and trims trailing zeros, matching the canonical
            // compact-JSON convention every language's driver targets.
            std::string __formatDouble(double value) {
                char __buf[64];
                snprintf(__buf, sizeof(__buf), "%.10f", value);
                std::string __s(__buf);
                size_t __lastNonZero = __s.find_last_not_of('0');
                if (__s[__lastNonZero] == '.') __lastNonZero++;
                return __s.substr(0, __lastNonZero + 1);
            }

            int main() {
                Solution sol;
                {{CppLiteral.TypeName(returnType)}} result = sol.{{functionName}}({{args}});
                {{printStatement}}
                return 0;
            }
            """;

        return
        [
            new PistonFile("Solution", studentCode),
            new PistonFile("Main", driver),
        ];
    }
}

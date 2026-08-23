using System.Text;
using System.Text.Json;
using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Infrastructure.Drivers;

internal static class CppLiteral
{
    public static string TypeName(ParameterType type) => type switch
    {
        ParameterType.Int => "int",
        ParameterType.Long => "long long",
        ParameterType.Double => "double",
        ParameterType.Boolean => "bool",
        ParameterType.String => "std::string",
        ParameterType.IntArray => "std::vector<int>",
        ParameterType.DoubleArray => "std::vector<double>",
        ParameterType.StringArray => "std::vector<std::string>",
        _ => throw new InvalidOperationException($"Unsupported parameter type: {type}"),
    };

    public static string Render(JsonElement value, ParameterType type) => type switch
    {
        ParameterType.Int => value.GetRawText(),
        ParameterType.Long => value.GetRawText() + "LL",
        ParameterType.Double => RenderDouble(value),
        ParameterType.Boolean => value.GetBoolean() ? "true" : "false",
        ParameterType.String => JsonSerializer.Serialize(value.GetString()),
        ParameterType.IntArray => RenderArray(value, "std::vector<int>", ParameterType.Int),
        ParameterType.DoubleArray => RenderArray(value, "std::vector<double>", ParameterType.Double),
        ParameterType.StringArray => RenderArray(value, "std::vector<std::string>", ParameterType.String),
        _ => throw new InvalidOperationException($"Unsupported parameter type: {type}"),
    };

    // Prints the canonical compact-JSON form of a value of the given type to
    // stdout - generated inline per known type, same reasoning as Java (no
    // JSON library available without extra dependencies).
    public static string RenderPrintStatement(ParameterType type, string valueExpression) => type switch
    {
        ParameterType.Int or ParameterType.Long => $"std::cout << {valueExpression};",
        ParameterType.Double => $"std::cout << __formatDouble({valueExpression});",
        ParameterType.Boolean => $"std::cout << ({valueExpression} ? \"true\" : \"false\");",
        ParameterType.String => $"std::cout << \"\\\"\" << {valueExpression} << \"\\\"\";",
        ParameterType.IntArray or ParameterType.DoubleArray =>
            $$"""
            { std::cout << "["; for (size_t __i = 0; __i < {{valueExpression}}.size(); __i++) { if (__i > 0) std::cout << ","; std::cout << {{(type == ParameterType.DoubleArray ? $"__formatDouble({valueExpression}[__i])" : $"{valueExpression}[__i]")}}; } std::cout << "]"; }
            """,
        ParameterType.StringArray =>
            $$"""
            { std::cout << "["; for (size_t __i = 0; __i < {{valueExpression}}.size(); __i++) { if (__i > 0) std::cout << ","; std::cout << "\"" << {{valueExpression}}[__i] << "\""; } std::cout << "]"; }
            """,
        _ => throw new InvalidOperationException($"Unsupported return type: {type}"),
    };

    private static string RenderDouble(JsonElement value)
    {
        var raw = value.GetRawText();
        return raw.Contains('.') || raw.Contains('e') || raw.Contains('E') ? raw : raw + ".0";
    }

    private static string RenderArray(JsonElement array, string vectorType, ParameterType elementType)
    {
        var sb = new StringBuilder($"{vectorType}{{");
        var first = true;
        foreach (var item in array.EnumerateArray())
        {
            if (!first)
            {
                sb.Append(',');
            }

            sb.Append(Render(item, elementType));
            first = false;
        }

        sb.Append('}');
        return sb.ToString();
    }
}

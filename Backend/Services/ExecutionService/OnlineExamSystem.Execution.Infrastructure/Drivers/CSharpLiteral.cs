using System.Text;
using System.Text.Json;
using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Infrastructure.Drivers;

internal static class CSharpLiteral
{
    public static string TypeName(ParameterType type) => type switch
    {
        ParameterType.Int => "int",
        ParameterType.Long => "long",
        ParameterType.Double => "double",
        ParameterType.Boolean => "bool",
        ParameterType.String => "string",
        ParameterType.IntArray => "int[]",
        ParameterType.DoubleArray => "double[]",
        ParameterType.StringArray => "string[]",
        _ => throw new InvalidOperationException($"Unsupported parameter type: {type}"),
    };

    public static string Render(JsonElement value, ParameterType type) => type switch
    {
        ParameterType.Int => value.GetRawText(),
        ParameterType.Long => value.GetRawText() + "L",
        ParameterType.Double => RenderDouble(value),
        ParameterType.Boolean => value.GetBoolean() ? "true" : "false",
        ParameterType.String => JsonSerializer.Serialize(value.GetString()),
        ParameterType.IntArray => RenderArray(value, "int", ParameterType.Int),
        ParameterType.DoubleArray => RenderArray(value, "double", ParameterType.Double),
        ParameterType.StringArray => RenderArray(value, "string", ParameterType.String),
        _ => throw new InvalidOperationException($"Unsupported parameter type: {type}"),
    };

    private static string RenderDouble(JsonElement value)
    {
        var raw = value.GetRawText();
        return raw.Contains('.') || raw.Contains('e') || raw.Contains('E') ? raw : raw + ".0";
    }

    private static string RenderArray(JsonElement array, string elementTypeName, ParameterType elementType)
    {
        var sb = new StringBuilder($"new {elementTypeName}[] {{");
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

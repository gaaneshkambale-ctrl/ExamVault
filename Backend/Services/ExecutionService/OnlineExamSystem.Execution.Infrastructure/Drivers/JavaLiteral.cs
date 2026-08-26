using System.Text;
using System.Text.Json;
using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Infrastructure.Drivers;

// Java is statically typed - array literals need an explicit element type
// (`new int[]{1,2,3}`), unlike Python/JavaScript's bare `[1,2,3]`. Renders a
// JSON value as a Java literal for a known ParameterType.
internal static class JavaLiteral
{
    public static string TypeName(ParameterType type) => type switch
    {
        ParameterType.Int => "int",
        ParameterType.Long => "long",
        ParameterType.Double => "double",
        ParameterType.Boolean => "boolean",
        ParameterType.String => "String",
        ParameterType.IntArray => "int[]",
        ParameterType.DoubleArray => "double[]",
        ParameterType.StringArray => "String[]",
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
        ParameterType.StringArray => RenderArray(value, "String", ParameterType.String),
        _ => throw new InvalidOperationException($"Unsupported parameter type: {type}"),
    };

    // Prints the canonical compact-JSON form of a value of the given type to
    // stdout - generated inline per known type rather than a generic runtime
    // helper, since Java has no built-in JSON serialization in the base JDK.
    public static string RenderPrintStatement(ParameterType type, string valueExpression) => type switch
    {
        ParameterType.Int or ParameterType.Long or ParameterType.Double or ParameterType.Boolean =>
            $"System.out.println({valueExpression});",
        ParameterType.String =>
            $"System.out.println(\"\\\"\" + {valueExpression}.replace(\"\\\\\", \"\\\\\\\\\").replace(\"\\\"\", \"\\\\\\\"\") + \"\\\"\");",
        ParameterType.IntArray or ParameterType.DoubleArray =>
            $$"""
            { StringBuilder __sb = new StringBuilder("["); for (int __i = 0; __i < {{valueExpression}}.length; __i++) { if (__i > 0) __sb.append(","); __sb.append({{valueExpression}}[__i]); } __sb.append("]"); System.out.println(__sb.toString()); }
            """,
        ParameterType.StringArray =>
            $$"""
            { StringBuilder __sb = new StringBuilder("["); for (int __i = 0; __i < {{valueExpression}}.length; __i++) { if (__i > 0) __sb.append(","); __sb.append("\"" + {{valueExpression}}[__i].replace("\\", "\\\\").replace("\"", "\\\"") + "\""); } __sb.append("]"); System.out.println(__sb.toString()); }
            """,
        _ => throw new InvalidOperationException($"Unsupported return type: {type}"),
    };

    private static string RenderDouble(JsonElement value)
    {
        var raw = value.GetRawText();
        return raw.Contains('.') || raw.Contains('e') || raw.Contains('E') ? raw : raw + ".0";
    }

    private static string RenderArray(JsonElement array, string elementTypeName, ParameterType elementType)
    {
        var sb = new StringBuilder($"new {elementTypeName}[]{{");
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

using System.Text;
using System.Text.Json;

namespace OnlineExamSystem.Execution.Infrastructure.Drivers;

// Renders a JSON value as a Python literal. JSON and Python share syntax for
// numbers, strings, and arrays (lists) - only booleans differ (True/False,
// capitalized) and null (None, unused here - every argument is required).
internal static class PythonLiteral
{
    public static string Render(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.Number => value.GetRawText(),
        JsonValueKind.String => JsonSerializer.Serialize(value.GetString()),
        JsonValueKind.True => "True",
        JsonValueKind.False => "False",
        JsonValueKind.Array => RenderArray(value),
        _ => throw new InvalidOperationException($"Unsupported JSON value kind for a Python literal: {value.ValueKind}"),
    };

    private static string RenderArray(JsonElement array)
    {
        var sb = new StringBuilder("[");
        var first = true;
        foreach (var item in array.EnumerateArray())
        {
            if (!first)
            {
                sb.Append(',');
            }

            sb.Append(Render(item));
            first = false;
        }

        sb.Append(']');
        return sb.ToString();
    }
}

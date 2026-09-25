using System.Text.Json;

namespace OnlineExamSystem.User.Application.Security;

/// <summary>Pure partition-key logic for the "auth" rate limiter (User API
/// Program.cs), no ASP.NET dependency so it is unit-testable. Keying on
/// client IP alone throttled a whole college lab behind one NAT'd IP at exam
/// start; keying on IP + the email being tried means different students
/// never share a bucket, while rapid guessing against one account from one
/// source is still limited (account lockout in LoginUserHandler remains the
/// cross-IP backstop). No usable email -> IP-only key, the previous
/// behaviour.</summary>
public static class AuthRateLimitKey
{
    public const int MaxBodyBytes = 8 * 1024;
    public const string EmailItemKey = "AuthRateLimit.Email";

    private static readonly HashSet<string> AuthPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/api/users/register",
        "/api/users/login",
        "/api/users/forgot-password",
        "/api/users/confirm-email",
        "/api/users/resend-confirmation-email",
    };

    public static bool IsAuthRequest(string method, string? path) =>
        string.Equals(method, "POST", StringComparison.OrdinalIgnoreCase)
        && path is not null
        && AuthPaths.Contains(path.TrimEnd('/'));

    /// <summary>Normalized (trimmed, lower-case) "email" property of a JSON
    /// object body, or null when the body is empty, too large, not a JSON
    /// object, or has no non-empty string "email".</summary>
    public static string? ExtractEmail(ReadOnlySpan<byte> jsonBody)
    {
        if (jsonBody.IsEmpty || jsonBody.Length > MaxBodyBytes)
        {
            return null;
        }

        try
        {
            var reader = new Utf8JsonReader(jsonBody);
            using var document = JsonDocument.ParseValue(ref reader);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            foreach (var property in document.RootElement.EnumerateObject())
            {
                if (property.Name.Equals("email", StringComparison.OrdinalIgnoreCase)
                    && property.Value.ValueKind == JsonValueKind.String)
                {
                    var email = property.Value.GetString()!.Trim().ToLowerInvariant();
                    return email.Length == 0 ? null : email;
                }
            }
        }
        catch (JsonException)
        {
        }

        return null;
    }

    public static string PartitionKey(string clientIp, string? email) =>
        email is null ? $"ip:{clientIp}" : $"ip:{clientIp}|email:{email}";
}

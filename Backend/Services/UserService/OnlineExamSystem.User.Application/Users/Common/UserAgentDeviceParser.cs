using System.Text.RegularExpressions;

namespace OnlineExamSystem.User.Application.Users.Common;

// Turns a raw User-Agent header into a short "Browser on OS" label for the
// Sessions list (e.g. "Chrome on Windows") - deliberately not a full UA
// parsing library, just enough to label the handful of browser/OS
// combinations real users show up with.
public static class UserAgentDeviceParser
{
    public static string Describe(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent))
        {
            return "Unknown device";
        }

        var browser = DetectBrowser(userAgent);
        var os = DetectOs(userAgent);

        if (browser is null && os is null)
        {
            return "Unknown device";
        }

        if (browser is null)
        {
            return os!;
        }

        if (os is null)
        {
            return browser;
        }

        return $"{browser} on {os}";
    }

    private static string? DetectBrowser(string ua)
    {
        if (Regex.IsMatch(ua, "Edg/"))
        {
            return "Edge";
        }

        if (Regex.IsMatch(ua, "OPR/|Opera"))
        {
            return "Opera";
        }

        if (Regex.IsMatch(ua, "Chrome/") && !Regex.IsMatch(ua, "Chromium"))
        {
            return "Chrome";
        }

        if (Regex.IsMatch(ua, "Firefox/"))
        {
            return "Firefox";
        }

        if (Regex.IsMatch(ua, "Safari/") && !Regex.IsMatch(ua, "Chrome"))
        {
            return "Safari";
        }

        return null;
    }

    private static string? DetectOs(string ua)
    {
        if (Regex.IsMatch(ua, "Windows"))
        {
            return "Windows";
        }

        if (Regex.IsMatch(ua, "Android"))
        {
            return "Android";
        }

        if (Regex.IsMatch(ua, "iPhone|iPad|iOS"))
        {
            return "iOS";
        }

        if (Regex.IsMatch(ua, "Mac OS X|Macintosh"))
        {
            return "macOS";
        }

        if (Regex.IsMatch(ua, "Linux"))
        {
            return "Linux";
        }

        return null;
    }
}

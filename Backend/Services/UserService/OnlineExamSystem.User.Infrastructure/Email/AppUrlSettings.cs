namespace OnlineExamSystem.User.Infrastructure.Email;

public class AppUrlSettings
{
    public const string SectionName = "App";

    /// <summary>
    /// Base URL for standard login (default: http://localhost:5173).
    /// </summary>
    public string FrontendBaseUrl { get; set; } = "http://localhost:5173";

    /// <summary>
    /// Base domain for tenant subdomains (default: localhost:5173 or examvaults.in).
    /// </summary>
    public string BaseDomain { get; set; } = "localhost:5173";

    /// <summary>
    /// Protocol scheme for tenant subdomains (http or https). Defaults to http in dev.
    /// </summary>
    public string Scheme { get; set; } = "http";
}

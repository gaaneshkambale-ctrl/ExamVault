using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Exam.Domain.Entities;

/// <summary>One row per tenant of organization-level settings shown on the General
/// Settings card. Logo/branding isn't stored here yet (needs a real file-storage
/// decision, deferred).</summary>
public class GeneralSettings : TenantScopedEntity
{
    public string OrganizationName { get; set; } = "ExamVault";
    public string SupportEmail { get; set; } = string.Empty;
    public string Language { get; set; } = "English (United States)";
    public string Timezone { get; set; } = "UTC";
    public string DateFormat { get; set; } = "DD MMM YYYY";
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

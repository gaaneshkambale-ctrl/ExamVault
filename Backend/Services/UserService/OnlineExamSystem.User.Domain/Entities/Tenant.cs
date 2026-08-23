using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.User.Domain.Entities;

public class Tenant : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    // The subdomain this tenant is reached at, e.g. "stanford" for
    // stanford.examvault.com. Resolved from the request Host header once
    // Gateway subdomain routing ships - not enforced yet.
    public string Slug { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

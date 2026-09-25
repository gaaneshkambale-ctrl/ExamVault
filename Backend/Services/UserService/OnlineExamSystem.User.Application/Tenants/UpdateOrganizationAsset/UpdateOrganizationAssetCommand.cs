namespace OnlineExamSystem.User.Application.Tenants.UpdateOrganizationAsset;

// Data/ContentType null means "remove" - a single command shape for both
// upload and delete, since both are just setting the pair of columns for
// the given asset slot.
public record UpdateOrganizationAssetCommand(
    Guid TenantId,
    OrganizationAssetKind Kind,
    byte[]? Data,
    string? ContentType);

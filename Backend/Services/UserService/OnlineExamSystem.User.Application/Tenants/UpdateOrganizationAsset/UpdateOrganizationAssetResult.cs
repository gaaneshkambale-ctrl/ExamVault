namespace OnlineExamSystem.User.Application.Tenants.UpdateOrganizationAsset;

public class UpdateOrganizationAssetResult
{
    public bool Success { get; init; }
    public bool TenantNotFound { get; init; }

    public static UpdateOrganizationAssetResult Ok() => new() { Success = true };

    public static UpdateOrganizationAssetResult NotFound() => new() { TenantNotFound = true };
}

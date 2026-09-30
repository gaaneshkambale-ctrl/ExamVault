using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tenants.UpdateOrganizationAsset;

public class UpdateOrganizationAssetHandler
{
    private readonly ITenantRepository _tenantRepository;

    public UpdateOrganizationAssetHandler(ITenantRepository tenantRepository)
    {
        _tenantRepository = tenantRepository;
    }

    public async Task<UpdateOrganizationAssetResult> HandleAsync(
        UpdateOrganizationAssetCommand command,
        CancellationToken cancellationToken = default)
    {
        var tenant = await _tenantRepository.GetByIdAsync(command.TenantId, cancellationToken);
        if (tenant is null)
        {
            return UpdateOrganizationAssetResult.NotFound();
        }

        switch (command.Kind)
        {
            case OrganizationAssetKind.Logo:
                tenant.LogoData = command.Data;
                tenant.LogoContentType = command.ContentType;
                break;
            case OrganizationAssetKind.Favicon:
                tenant.FaviconData = command.Data;
                tenant.FaviconContentType = command.ContentType;
                break;
            case OrganizationAssetKind.Signature:
                tenant.SignatureImageData = command.Data;
                tenant.SignatureImageContentType = command.ContentType;
                break;
        }

        await _tenantRepository.SaveChangesAsync(cancellationToken);

        return UpdateOrganizationAssetResult.Ok();
    }
}

using OnlineExamSystem.User.Application.Tenants.UpdateOrganizationAsset;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class UpdateOrganizationAssetHandlerTests
{
    [Fact]
    public async Task Uploading_a_logo_sets_data_and_content_type()
    {
        var tenantId = Guid.NewGuid();
        var repository = new FakeTenantRepository();
        await repository.AddAsync(new Tenant { Id = tenantId, Name = "Org", Slug = "org" });
        var handler = new UpdateOrganizationAssetHandler(repository);

        var result = await handler.HandleAsync(
            new UpdateOrganizationAssetCommand(tenantId, OrganizationAssetKind.Logo, [1, 2, 3], "image/png"));

        Assert.True(result.Success);
        var tenant = await repository.GetByIdAsync(tenantId);
        Assert.Equal(new byte[] { 1, 2, 3 }, tenant!.LogoData);
        Assert.Equal("image/png", tenant.LogoContentType);
    }

    [Fact]
    public async Task Removing_a_favicon_clears_data_and_content_type()
    {
        var tenantId = Guid.NewGuid();
        var repository = new FakeTenantRepository();
        await repository.AddAsync(new Tenant
        {
            Id = tenantId,
            Name = "Org",
            Slug = "org",
            FaviconData = [9, 9],
            FaviconContentType = "image/x-icon",
        });
        var handler = new UpdateOrganizationAssetHandler(repository);

        var result = await handler.HandleAsync(
            new UpdateOrganizationAssetCommand(tenantId, OrganizationAssetKind.Favicon, null, null));

        Assert.True(result.Success);
        var tenant = await repository.GetByIdAsync(tenantId);
        Assert.Null(tenant!.FaviconData);
        Assert.Null(tenant.FaviconContentType);
    }

    [Fact]
    public async Task Signature_kind_only_touches_signature_columns()
    {
        var tenantId = Guid.NewGuid();
        var repository = new FakeTenantRepository();
        await repository.AddAsync(new Tenant
        {
            Id = tenantId,
            Name = "Org",
            Slug = "org",
            LogoData = [1],
            LogoContentType = "image/png",
        });
        var handler = new UpdateOrganizationAssetHandler(repository);

        await handler.HandleAsync(
            new UpdateOrganizationAssetCommand(tenantId, OrganizationAssetKind.Signature, [7], "image/webp"));

        var tenant = await repository.GetByIdAsync(tenantId);
        Assert.Equal(new byte[] { 7 }, tenant!.SignatureImageData);
        Assert.Equal(new byte[] { 1 }, tenant.LogoData);
    }

    [Fact]
    public async Task Missing_tenant_returns_not_found()
    {
        var repository = new FakeTenantRepository();
        var handler = new UpdateOrganizationAssetHandler(repository);

        var result = await handler.HandleAsync(
            new UpdateOrganizationAssetCommand(Guid.NewGuid(), OrganizationAssetKind.Logo, [1], "image/png"));

        Assert.False(result.Success);
        Assert.True(result.TenantNotFound);
    }
}

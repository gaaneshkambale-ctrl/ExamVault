using OnlineExamSystem.User.Application.Tenants.UpdateOrganizationSettings;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class UpdateOrganizationSettingsHandlerTests
{
    private static UpdateOrganizationSettingsHandler CreateHandler(FakeTenantRepository repository) =>
        new(repository, new UpdateOrganizationSettingsValidator());

    private static UpdateOrganizationSettingsCommand ValidCommand(Guid tenantId) => new(
        tenantId,
        Name: "St. Xavier's University",
        ShortName: "SXU",
        OrganizationType: "University",
        EstablishedYear: 1960,
        Website: "https://www.sxu.edu",
        ContactEmail: "info@sxu.edu",
        ContactPhone: "+1 312 555 0100",
        AlternatePhone: "+1 312 555 0101",
        RegistrationNumber: "SXU-REG-2026-09",
        TaxIdentificationNumber: "12-3456789",
        TimeZone: "America/Chicago",
        AddressLine1: "200 College Way",
        AddressLine2: null,
        City: "Chicago",
        State: "Illinois",
        PostalCode: "60611",
        Country: "United States",
        PrimaryColor: "#1E40AF",
        SecondaryColor: "#7C3AED",
        AccentColor: "#059669",
        TextColor: "#1F2937",
        SignatoryName: "Dr. A. Varma",
        SignatoryDesignation: "Registrar",
        ShowLogoOnPdfReports: true,
        IncludeAddressInPdfFooter: true,
        ShowMottoTagline: true,
        EnableMultiCampus: false,
        ShowQrCodeForVerification: true,
        ShowContactDetails: true,
        ShowPageNumbers: true,
        UseBrandColorsInReportHeader: true,
        EnableWatermark: false,
        MottoTagline: "Knowledge for a Better Tomorrow",
        DefaultAcademicYear: "2026-2027",
        DefaultLanguage: "English (US)",
        DateFormat: "MM/DD/YYYY");

    [Fact]
    public async Task Valid_command_updates_and_persists_every_field()
    {
        var tenantId = Guid.NewGuid();
        var repository = new FakeTenantRepository();
        await repository.AddAsync(new Tenant { Id = tenantId, Name = "Old Name", Slug = "old" });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(ValidCommand(tenantId));

        Assert.True(result.Success);
        Assert.Equal("St. Xavier's University", result.Tenant!.Name);
        Assert.Equal("SXU", result.Tenant.ShortName);
        Assert.Equal("#1E40AF", result.Tenant.PrimaryColor);
        Assert.Equal("Dr. A. Varma", result.Tenant.SignatoryName);
        Assert.True(result.Tenant.ShowLogoOnPdfReports);
    }

    [Fact]
    public async Task Missing_tenant_returns_not_found()
    {
        var repository = new FakeTenantRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(ValidCommand(Guid.NewGuid()));

        Assert.False(result.Success);
        Assert.True(result.TenantNotFound);
    }

    [Fact]
    public async Task Empty_name_fails_validation()
    {
        var tenantId = Guid.NewGuid();
        var repository = new FakeTenantRepository();
        await repository.AddAsync(new Tenant { Id = tenantId, Name = "Old Name", Slug = "old" });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(ValidCommand(tenantId) with { Name = "" });

        Assert.False(result.Success);
        Assert.NotEmpty(result.ValidationErrors);
    }

    [Fact]
    public async Task Invalid_hex_color_fails_validation()
    {
        var tenantId = Guid.NewGuid();
        var repository = new FakeTenantRepository();
        await repository.AddAsync(new Tenant { Id = tenantId, Name = "Old Name", Slug = "old" });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(ValidCommand(tenantId) with { PrimaryColor = "blue" });

        Assert.False(result.Success);
        Assert.NotEmpty(result.ValidationErrors);
    }

    [Fact]
    public async Task Blank_optional_fields_are_stored_as_null()
    {
        var tenantId = Guid.NewGuid();
        var repository = new FakeTenantRepository();
        await repository.AddAsync(new Tenant { Id = tenantId, Name = "Old Name", Slug = "old" });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(ValidCommand(tenantId) with { ShortName = "   ", Website = "" });

        Assert.True(result.Success);
        Assert.Null(result.Tenant!.ShortName);
        Assert.Null(result.Tenant.Website);
    }
}

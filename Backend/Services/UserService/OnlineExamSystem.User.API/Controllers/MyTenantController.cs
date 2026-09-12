using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.Shared.Contracts.Requests.User;
using OnlineExamSystem.Shared.Contracts.Responses.User;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Tenants.GetOrganizationSettings;
using OnlineExamSystem.User.Application.Tenants.UpdateOrganizationAsset;
using OnlineExamSystem.User.Application.Tenants.UpdateOrganizationSettings;
using OnlineExamSystem.User.Domain.Entities;
using static OnlineExamSystem.User.API.Authorization.PermissionPolicies;

namespace OnlineExamSystem.User.API.Controllers;

// Self-service organization info for the currently authenticated user's own
// tenant - eg. the Advanced Exam Report PDF's org name/address block, and
// (via the Settings actions below) the tenant Admin's own Organization
// Settings page. Deliberately separate from TenantsController, which is
// [Authorize(Roles = "SuperAdmin")] at the class level for cross-tenant
// provisioning; this reads/writes only the caller's own tenant (off the
// JWT's tenant_id claim, never a route parameter).
[ApiController]
[Route("api/tenants/mine")]
[Authorize]
public class MyTenantController : ControllerBase
{
    private static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/x-icon",
        "image/vnd.microsoft.icon",
    };

    private const long MaxAssetSizeBytes = 2 * 1024 * 1024;

    private readonly ITenantRepository _tenantRepository;
    private readonly GetOrganizationSettingsHandler _getOrganizationSettingsHandler;
    private readonly UpdateOrganizationSettingsHandler _updateOrganizationSettingsHandler;
    private readonly UpdateOrganizationAssetHandler _updateOrganizationAssetHandler;

    public MyTenantController(
        ITenantRepository tenantRepository,
        GetOrganizationSettingsHandler getOrganizationSettingsHandler,
        UpdateOrganizationSettingsHandler updateOrganizationSettingsHandler,
        UpdateOrganizationAssetHandler updateOrganizationAssetHandler)
    {
        _tenantRepository = tenantRepository;
        _getOrganizationSettingsHandler = getOrganizationSettingsHandler;
        _updateOrganizationSettingsHandler = updateOrganizationSettingsHandler;
        _updateOrganizationAssetHandler = updateOrganizationAssetHandler;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var tenant = await GetOwnTenantAsync(cancellationToken);
        if (tenant is null)
        {
            return NotFound(new { message = "Organization not found." });
        }

        return Ok(new MyTenantResponse(
            tenant.Name,
            tenant.AddressLine1,
            tenant.AddressLine2,
            tenant.City,
            tenant.State,
            tenant.PostalCode,
            tenant.Country));
    }

    [Authorize(Roles = "Admin,SuperAdmin")]
    [Authorize(Policy = SettingsView)]
    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings(CancellationToken cancellationToken)
    {
        var tenantId = GetOwnTenantId();
        if (tenantId is null)
        {
            return NotFound(new { message = "No organization associated with this account." });
        }

        var tenant = await _getOrganizationSettingsHandler.HandleAsync(
            new GetOrganizationSettingsQuery(tenantId.Value), cancellationToken);
        if (tenant is null)
        {
            return NotFound(new { message = "Organization not found." });
        }

        return Ok(ToSettingsResponse(tenant));
    }

    [Authorize(Roles = "Admin,SuperAdmin")]
    [Authorize(Policy = SettingsEdit)]
    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings(UpdateOrganizationSettingsRequest request, CancellationToken cancellationToken)
    {
        var tenantId = GetOwnTenantId();
        if (tenantId is null)
        {
            return NotFound(new { message = "No organization associated with this account." });
        }

        var result = await _updateOrganizationSettingsHandler.HandleAsync(
            new UpdateOrganizationSettingsCommand(
                tenantId.Value,
                request.Name,
                request.ShortName,
                request.OrganizationType,
                request.EstablishedYear,
                request.Website,
                request.ContactEmail,
                request.ContactPhone,
                request.AlternatePhone,
                request.RegistrationNumber,
                request.TaxIdentificationNumber,
                request.TimeZone,
                request.AddressLine1,
                request.AddressLine2,
                request.City,
                request.State,
                request.PostalCode,
                request.Country,
                request.PrimaryColor,
                request.SecondaryColor,
                request.AccentColor,
                request.TextColor,
                request.SignatoryName,
                request.SignatoryDesignation,
                request.ShowLogoOnPdfReports,
                request.IncludeAddressInPdfFooter,
                request.ShowMottoTagline,
                request.EnableMultiCampus,
                request.ShowQrCodeForVerification,
                request.ShowContactDetails,
                request.ShowPageNumbers,
                request.UseBrandColorsInReportHeader,
                request.EnableWatermark,
                request.MottoTagline,
                request.DefaultAcademicYear,
                request.DefaultLanguage,
                request.DateFormat),
            cancellationToken);

        if (result.ValidationErrors.Any())
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        if (result.TenantNotFound)
        {
            return NotFound(new { message = "Organization not found." });
        }

        return Ok(ToSettingsResponse(result.Tenant!));
    }

    [HttpGet("logo")]
    public Task<IActionResult> GetLogo(CancellationToken cancellationToken) =>
        GetAssetAsync(t => (t.LogoData, t.LogoContentType), cancellationToken);

    [Authorize(Roles = "Admin,SuperAdmin")]
    [Authorize(Policy = SettingsEdit)]
    [HttpPost("logo")]
    [RequestSizeLimit(MaxAssetSizeBytes)]
    public Task<IActionResult> UploadLogo(IFormFile file, CancellationToken cancellationToken) =>
        UploadAssetAsync(OrganizationAssetKind.Logo, file, cancellationToken);

    [Authorize(Roles = "Admin,SuperAdmin")]
    [Authorize(Policy = SettingsEdit)]
    [HttpDelete("logo")]
    public Task<IActionResult> RemoveLogo(CancellationToken cancellationToken) =>
        RemoveAssetAsync(OrganizationAssetKind.Logo, cancellationToken);

    [HttpGet("favicon")]
    public Task<IActionResult> GetFavicon(CancellationToken cancellationToken) =>
        GetAssetAsync(t => (t.FaviconData, t.FaviconContentType), cancellationToken);

    [Authorize(Roles = "Admin,SuperAdmin")]
    [Authorize(Policy = SettingsEdit)]
    [HttpPost("favicon")]
    [RequestSizeLimit(MaxAssetSizeBytes)]
    public Task<IActionResult> UploadFavicon(IFormFile file, CancellationToken cancellationToken) =>
        UploadAssetAsync(OrganizationAssetKind.Favicon, file, cancellationToken);

    [Authorize(Roles = "Admin,SuperAdmin")]
    [Authorize(Policy = SettingsEdit)]
    [HttpDelete("favicon")]
    public Task<IActionResult> RemoveFavicon(CancellationToken cancellationToken) =>
        RemoveAssetAsync(OrganizationAssetKind.Favicon, cancellationToken);

    [HttpGet("signature")]
    public Task<IActionResult> GetSignature(CancellationToken cancellationToken) =>
        GetAssetAsync(t => (t.SignatureImageData, t.SignatureImageContentType), cancellationToken);

    [Authorize(Roles = "Admin,SuperAdmin")]
    [Authorize(Policy = SettingsEdit)]
    [HttpPost("signature")]
    [RequestSizeLimit(MaxAssetSizeBytes)]
    public Task<IActionResult> UploadSignature(IFormFile file, CancellationToken cancellationToken) =>
        UploadAssetAsync(OrganizationAssetKind.Signature, file, cancellationToken);

    [Authorize(Roles = "Admin,SuperAdmin")]
    [Authorize(Policy = SettingsEdit)]
    [HttpDelete("signature")]
    public Task<IActionResult> RemoveSignature(CancellationToken cancellationToken) =>
        RemoveAssetAsync(OrganizationAssetKind.Signature, cancellationToken);

    private async Task<IActionResult> GetAssetAsync(
        Func<Tenant, (byte[]? Data, string? ContentType)> select,
        CancellationToken cancellationToken)
    {
        var tenant = await GetOwnTenantAsync(cancellationToken);
        var (data, contentType) = tenant is null ? (null, null) : select(tenant);
        if (data is null)
        {
            return NotFound();
        }

        return File(data, contentType ?? "application/octet-stream");
    }

    private async Task<IActionResult> UploadAssetAsync(OrganizationAssetKind kind, IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "No file was provided." });
        }

        if (file.Length > MaxAssetSizeBytes)
        {
            return BadRequest(new { message = "File must be 2 MB or smaller." });
        }

        if (!AllowedImageContentTypes.Contains(file.ContentType))
        {
            return BadRequest(new { message = "File must be a JPEG, PNG, WebP, or ICO image." });
        }

        var tenantId = GetOwnTenantId();
        if (tenantId is null)
        {
            return NotFound(new { message = "No organization associated with this account." });
        }

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream, cancellationToken);

        var result = await _updateOrganizationAssetHandler.HandleAsync(
            new UpdateOrganizationAssetCommand(tenantId.Value, kind, memoryStream.ToArray(), file.ContentType),
            cancellationToken);

        if (result.TenantNotFound)
        {
            return NotFound(new { message = "Organization not found." });
        }

        return NoContent();
    }

    private async Task<IActionResult> RemoveAssetAsync(OrganizationAssetKind kind, CancellationToken cancellationToken)
    {
        var tenantId = GetOwnTenantId();
        if (tenantId is null)
        {
            return NotFound(new { message = "No organization associated with this account." });
        }

        var result = await _updateOrganizationAssetHandler.HandleAsync(
            new UpdateOrganizationAssetCommand(tenantId.Value, kind, null, null),
            cancellationToken);

        if (result.TenantNotFound)
        {
            return NotFound(new { message = "Organization not found." });
        }

        return NoContent();
    }

    private Guid? GetOwnTenantId()
    {
        var tenantIdClaim = User.FindFirst(TenantClaimTypes.TenantId)?.Value;
        return Guid.TryParse(tenantIdClaim, out var tenantId) ? tenantId : null;
    }

    private Task<Tenant?> GetOwnTenantAsync(CancellationToken cancellationToken)
    {
        var tenantId = GetOwnTenantId();
        return tenantId is null
            ? Task.FromResult<Tenant?>(null)
            : _tenantRepository.GetByIdAsync(tenantId.Value, cancellationToken);
    }

    private static OrganizationSettingsResponse ToSettingsResponse(Tenant tenant) =>
        new(
            tenant.Name,
            tenant.ShortName,
            tenant.OrganizationType,
            tenant.EstablishedYear,
            tenant.Website,
            tenant.ContactEmail,
            tenant.ContactPhone,
            tenant.AlternatePhone,
            tenant.RegistrationNumber,
            tenant.TaxIdentificationNumber,
            tenant.TimeZone,
            tenant.AddressLine1,
            tenant.AddressLine2,
            tenant.City,
            tenant.State,
            tenant.PostalCode,
            tenant.Country,
            tenant.PrimaryColor,
            tenant.SecondaryColor,
            tenant.AccentColor,
            tenant.TextColor,
            tenant.SignatoryName,
            tenant.SignatoryDesignation,
            tenant.ShowLogoOnPdfReports,
            tenant.IncludeAddressInPdfFooter,
            tenant.ShowMottoTagline,
            tenant.EnableMultiCampus,
            tenant.ShowQrCodeForVerification,
            tenant.ShowContactDetails,
            tenant.ShowPageNumbers,
            tenant.UseBrandColorsInReportHeader,
            tenant.EnableWatermark,
            tenant.MottoTagline,
            tenant.DefaultAcademicYear,
            tenant.DefaultLanguage,
            tenant.DateFormat,
            tenant.LogoData is not null,
            tenant.FaviconData is not null,
            tenant.SignatureImageData is not null,
            tenant.OrganizationCode);
}

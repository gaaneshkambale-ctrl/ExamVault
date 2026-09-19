using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tenants.UpdateOrganizationSettings;

public class UpdateOrganizationSettingsHandler
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IValidator<UpdateOrganizationSettingsCommand> _validator;

    public UpdateOrganizationSettingsHandler(
        ITenantRepository tenantRepository,
        IValidator<UpdateOrganizationSettingsCommand> validator)
    {
        _tenantRepository = tenantRepository;
        _validator = validator;
    }

    public async Task<UpdateOrganizationSettingsResult> HandleAsync(
        UpdateOrganizationSettingsCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return UpdateOrganizationSettingsResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var tenant = await _tenantRepository.GetByIdAsync(command.TenantId, cancellationToken);
        if (tenant is null)
        {
            return UpdateOrganizationSettingsResult.NotFound();
        }

        tenant.Name = command.Name;
        tenant.ShortName = Trim(command.ShortName);
        tenant.OrganizationType = Trim(command.OrganizationType);
        tenant.EstablishedYear = command.EstablishedYear;
        tenant.Website = Trim(command.Website);
        tenant.ContactEmail = Trim(command.ContactEmail);
        tenant.ContactPhone = Trim(command.ContactPhone);
        tenant.AlternatePhone = Trim(command.AlternatePhone);
        tenant.RegistrationNumber = Trim(command.RegistrationNumber);
        tenant.TaxIdentificationNumber = Trim(command.TaxIdentificationNumber);
        tenant.TimeZone = Trim(command.TimeZone);
        tenant.AddressLine1 = Trim(command.AddressLine1);
        tenant.AddressLine2 = Trim(command.AddressLine2);
        tenant.City = Trim(command.City);
        tenant.State = Trim(command.State);
        tenant.PostalCode = Trim(command.PostalCode);
        tenant.Country = Trim(command.Country);
        tenant.PrimaryColor = Trim(command.PrimaryColor);
        tenant.SecondaryColor = Trim(command.SecondaryColor);
        tenant.AccentColor = Trim(command.AccentColor);
        tenant.TextColor = Trim(command.TextColor);
        tenant.SignatoryName = Trim(command.SignatoryName);
        tenant.SignatoryDesignation = Trim(command.SignatoryDesignation);
        tenant.ShowLogoOnPdfReports = command.ShowLogoOnPdfReports;
        tenant.IncludeAddressInPdfFooter = command.IncludeAddressInPdfFooter;
        tenant.ShowMottoTagline = command.ShowMottoTagline;
        tenant.EnableMultiCampus = command.EnableMultiCampus;
        tenant.ShowQrCodeForVerification = command.ShowQrCodeForVerification;
        tenant.ShowContactDetails = command.ShowContactDetails;
        tenant.ShowPageNumbers = command.ShowPageNumbers;
        tenant.UseBrandColorsInReportHeader = command.UseBrandColorsInReportHeader;
        tenant.EnableWatermark = command.EnableWatermark;
        tenant.MottoTagline = Trim(command.MottoTagline);
        tenant.DefaultAcademicYear = Trim(command.DefaultAcademicYear);
        tenant.DefaultLanguage = Trim(command.DefaultLanguage);
        tenant.DateFormat = Trim(command.DateFormat);

        await _tenantRepository.SaveChangesAsync(cancellationToken);

        return UpdateOrganizationSettingsResult.Ok(tenant);
    }

    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

namespace OnlineExamSystem.Shared.Contracts.Responses.User;

// The tenant Admin's own self-service organization profile - name/contact/
// branding/PDF-letterhead fields, editable via PUT api/tenants/mine/settings.
// Image bytes (logo/favicon/signature) are fetched separately via their own
// GET endpoints - this only carries presence flags so the frontend knows
// whether to render an <img> or an empty-state upload prompt.
public record OrganizationSettingsResponse(
    string Name,
    string? ShortName,
    string? OrganizationType,
    int? EstablishedYear,
    string? Website,
    string? ContactEmail,
    string? ContactPhone,
    string? AlternatePhone,
    string? RegistrationNumber,
    string? TaxIdentificationNumber,
    string? TimeZone,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? PostalCode,
    string? Country,
    string? PrimaryColor,
    string? SecondaryColor,
    string? AccentColor,
    string? TextColor,
    string? SignatoryName,
    string? SignatoryDesignation,
    bool ShowLogoOnPdfReports,
    bool IncludeAddressInPdfFooter,
    bool ShowMottoTagline,
    bool EnableMultiCampus,
    bool ShowQrCodeForVerification,
    bool ShowContactDetails,
    bool ShowPageNumbers,
    bool UseBrandColorsInReportHeader,
    bool EnableWatermark,
    string? MottoTagline,
    string? DefaultAcademicYear,
    string? DefaultLanguage,
    string? DateFormat,
    bool HasLogo,
    bool HasFavicon,
    bool HasSignature,
    string? OrganizationCode);

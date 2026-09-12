using FluentValidation;

namespace OnlineExamSystem.User.Application.Tenants.UpdateOrganizationSettings;

public class UpdateOrganizationSettingsValidator : AbstractValidator<UpdateOrganizationSettingsCommand>
{
    public UpdateOrganizationSettingsValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ShortName).MaximumLength(20);
        RuleFor(x => x.OrganizationType).MaximumLength(100);
        RuleFor(x => x.EstablishedYear).InclusiveBetween(1800, 2100).When(x => x.EstablishedYear.HasValue);
        RuleFor(x => x.Website).MaximumLength(300);
        RuleFor(x => x.ContactEmail).EmailAddress().MaximumLength(320).When(x => !string.IsNullOrWhiteSpace(x.ContactEmail));
        RuleFor(x => x.ContactPhone).MaximumLength(30);
        RuleFor(x => x.AlternatePhone).MaximumLength(30);
        RuleFor(x => x.RegistrationNumber).MaximumLength(100);
        RuleFor(x => x.TaxIdentificationNumber).MaximumLength(100);
        RuleFor(x => x.TimeZone).MaximumLength(100);
        RuleFor(x => x.AddressLine1).MaximumLength(200);
        RuleFor(x => x.AddressLine2).MaximumLength(200);
        RuleFor(x => x.City).MaximumLength(100);
        RuleFor(x => x.State).MaximumLength(100);
        RuleFor(x => x.PostalCode).MaximumLength(20);
        RuleFor(x => x.Country).MaximumLength(100);

        RuleFor(x => x.PrimaryColor).Must(BeAValidHexColor).WithMessage("Must be a hex color like #4F46E5.").When(x => !string.IsNullOrWhiteSpace(x.PrimaryColor));
        RuleFor(x => x.SecondaryColor).Must(BeAValidHexColor).WithMessage("Must be a hex color like #4F46E5.").When(x => !string.IsNullOrWhiteSpace(x.SecondaryColor));
        RuleFor(x => x.AccentColor).Must(BeAValidHexColor).WithMessage("Must be a hex color like #4F46E5.").When(x => !string.IsNullOrWhiteSpace(x.AccentColor));
        RuleFor(x => x.TextColor).Must(BeAValidHexColor).WithMessage("Must be a hex color like #4F46E5.").When(x => !string.IsNullOrWhiteSpace(x.TextColor));

        RuleFor(x => x.SignatoryName).MaximumLength(200);
        RuleFor(x => x.SignatoryDesignation).MaximumLength(100);
        RuleFor(x => x.MottoTagline).MaximumLength(200);
        RuleFor(x => x.DefaultAcademicYear).MaximumLength(20);
        RuleFor(x => x.DefaultLanguage).MaximumLength(50);
        RuleFor(x => x.DateFormat).MaximumLength(20);
    }

    private static bool BeAValidHexColor(string? value) =>
        value is not null && System.Text.RegularExpressions.Regex.IsMatch(value, "^#[0-9A-Fa-f]{6}$");
}

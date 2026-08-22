using FluentValidation;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Application.Users.UpdateMyProfile;

public class UpdateMyProfileValidator : AbstractValidator<UpdateMyProfileCommand>
{
    public UpdateMyProfileValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.PhoneNumber)
            .Matches(@"^[0-9+\-\s()]{7,20}$")
            .WithMessage("Enter a valid phone number.")
            .When(x => !string.IsNullOrWhiteSpace(x.PhoneNumber));

        RuleFor(x => x.Username).MaximumLength(100);
        RuleFor(x => x.AlternateEmail).EmailAddress().MaximumLength(256)
            .When(x => !string.IsNullOrWhiteSpace(x.AlternateEmail));
        RuleFor(x => x.Gender).IsEnumName(typeof(Gender), caseSensitive: false)
            .When(x => !string.IsNullOrWhiteSpace(x.Gender));
        RuleFor(x => x.Location).MaximumLength(200);
        RuleFor(x => x.Department).MaximumLength(100);
    }
}

using FluentValidation;

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
    }
}

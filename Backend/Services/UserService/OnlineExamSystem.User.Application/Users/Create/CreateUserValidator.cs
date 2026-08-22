using FluentValidation;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Application.Users.Create;

public class CreateUserValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(256);

        RuleFor(x => x.Role)
            .NotEmpty()
            .IsEnumName(typeof(UserRole), caseSensitive: false);

        RuleFor(x => x.RollNumber)
            .MaximumLength(40);

        RuleFor(x => x.PhoneNumber)
            .Matches(@"^[0-9+\-\s()]{7,20}$")
            .WithMessage("Enter a valid phone number.")
            .When(x => !string.IsNullOrWhiteSpace(x.PhoneNumber));
    }
}

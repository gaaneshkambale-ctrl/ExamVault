using FluentValidation;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Application.Users.Update;

public class UpdateUserValidator : AbstractValidator<UpdateUserCommand>
{
    public UpdateUserValidator()
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
    }
}

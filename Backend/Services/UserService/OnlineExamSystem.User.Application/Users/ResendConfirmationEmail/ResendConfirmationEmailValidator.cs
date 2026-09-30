using FluentValidation;

namespace OnlineExamSystem.User.Application.Users.ResendConfirmationEmail;

public class ResendConfirmationEmailValidator : AbstractValidator<ResendConfirmationEmailCommand>
{
    public ResendConfirmationEmailValidator()
    {
        RuleFor(x => x.Email).NotEmpty();
    }
}

using FluentValidation;

namespace OnlineExamSystem.User.Application.Users.ConfirmEmail;

public class ConfirmEmailValidator : AbstractValidator<ConfirmEmailCommand>
{
    public ConfirmEmailValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
    }
}

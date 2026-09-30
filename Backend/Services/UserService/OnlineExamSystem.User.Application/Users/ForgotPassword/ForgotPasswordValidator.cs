using FluentValidation;

namespace OnlineExamSystem.User.Application.Users.ForgotPassword;

public class ForgotPasswordValidator : AbstractValidator<ForgotPasswordCommand>
{
    public ForgotPasswordValidator()
    {
        RuleFor(x => x.Email).NotEmpty();
    }
}

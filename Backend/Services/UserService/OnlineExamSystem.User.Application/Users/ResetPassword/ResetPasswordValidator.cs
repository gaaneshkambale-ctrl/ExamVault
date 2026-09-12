using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Users.ResetPassword;

public class ResetPasswordValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordValidator(IPasswordPolicyProvider passwordPolicyProvider)
    {
        RuleFor(x => x.NewPassword).NotEmpty();

        RuleFor(x => x)
            .CustomAsync(async (command, context, cancellationToken) =>
            {
                if (string.IsNullOrEmpty(command.NewPassword))
                {
                    return;
                }
                var policy = await passwordPolicyProvider.GetPolicyAsync(cancellationToken);
                foreach (var error in policy.Validate(command.NewPassword))
                {
                    context.AddFailure(nameof(command.NewPassword), error);
                }
            });
    }
}

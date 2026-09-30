using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Users.ResetPasswordWithToken;

public class ResetPasswordWithTokenValidator : AbstractValidator<ResetPasswordWithTokenCommand>
{
    public ResetPasswordWithTokenValidator(IPasswordPolicyProvider passwordPolicyProvider)
    {
        RuleFor(x => x.Token).NotEmpty();
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

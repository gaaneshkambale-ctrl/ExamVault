using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Users.Register;

public class RegisterUserValidator : AbstractValidator<RegisterUserCommand>
{
    public RegisterUserValidator(IPasswordPolicyProvider passwordPolicyProvider)
    {
        RuleFor(x => x.FullName)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(256);

        RuleFor(x => x.Password).NotEmpty();

        // The live Security Settings > Password Policy, not hardcoded rules -
        // one failure per violated rule, same messages the old .Matches() calls
        // produced, so existing frontend error handling doesn't need to change.
        RuleFor(x => x)
            .CustomAsync(async (command, context, cancellationToken) =>
            {
                if (string.IsNullOrEmpty(command.Password))
                {
                    return;
                }
                var policy = await passwordPolicyProvider.GetPolicyAsync(cancellationToken);
                foreach (var error in policy.Validate(command.Password))
                {
                    context.AddFailure(nameof(command.Password), error);
                }
            });
    }
}

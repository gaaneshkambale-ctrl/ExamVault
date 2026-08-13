using FluentValidation;

namespace OnlineExamSystem.Submission.Application.Attempts.Submit;

public class SubmitAttemptValidator : AbstractValidator<SubmitAttemptCommand>
{
    public SubmitAttemptValidator()
    {
        RuleFor(x => x.AttemptId).NotEmpty();
        RuleFor(x => x.UserId).NotEmpty();
    }
}

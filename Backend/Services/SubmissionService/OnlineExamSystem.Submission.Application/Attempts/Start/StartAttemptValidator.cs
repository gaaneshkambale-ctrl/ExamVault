using FluentValidation;

namespace OnlineExamSystem.Submission.Application.Attempts.Start;

public class StartAttemptValidator : AbstractValidator<StartAttemptCommand>
{
    public StartAttemptValidator()
    {
        RuleFor(x => x.ExamId).NotEmpty();
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.BearerToken).NotEmpty();
    }
}

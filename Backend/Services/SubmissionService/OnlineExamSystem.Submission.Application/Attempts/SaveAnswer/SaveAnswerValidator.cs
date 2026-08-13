using FluentValidation;

namespace OnlineExamSystem.Submission.Application.Attempts.SaveAnswer;

public class SaveAnswerValidator : AbstractValidator<SaveAnswerCommand>
{
    public SaveAnswerValidator()
    {
        RuleFor(x => x.AttemptId).NotEmpty();
        RuleFor(x => x.QuestionId).NotEmpty();
        RuleFor(x => x.UserId).NotEmpty();
    }
}

using FluentValidation;

namespace OnlineExamSystem.Submission.Application.Attempts.Grade;

public class GradeAnswerValidator : AbstractValidator<GradeAnswerCommand>
{
    public GradeAnswerValidator()
    {
        RuleFor(x => x.AttemptId).NotEmpty();
        RuleFor(x => x.QuestionId).NotEmpty();
        RuleFor(x => x.GradedByUserId).NotEmpty();
        RuleFor(x => x.MarksAwarded).GreaterThanOrEqualTo(0);
    }
}

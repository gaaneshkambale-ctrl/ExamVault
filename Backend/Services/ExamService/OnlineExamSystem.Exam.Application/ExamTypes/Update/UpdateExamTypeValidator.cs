using FluentValidation;

namespace OnlineExamSystem.Exam.Application.ExamTypes.Update;

public class UpdateExamTypeValidator : AbstractValidator<UpdateExamTypeCommand>
{
    public UpdateExamTypeValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.Purpose)
            .MaximumLength(500);
    }
}

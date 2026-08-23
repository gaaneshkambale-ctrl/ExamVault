using FluentValidation;

namespace OnlineExamSystem.Exam.Application.ExamTypes.Create;

public class CreateExamTypeValidator : AbstractValidator<CreateExamTypeCommand>
{
    public CreateExamTypeValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.Purpose)
            .MaximumLength(500);
    }
}

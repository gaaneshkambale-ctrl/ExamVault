using FluentValidation;

namespace OnlineExamSystem.User.Application.Plans.Create;

public class CreatePlanValidator : AbstractValidator<CreatePlanCommand>
{
    public CreatePlanValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(1000);
        RuleFor(x => x.MonthlyPrice).GreaterThanOrEqualTo(0).When(x => x.MonthlyPrice.HasValue);
        RuleFor(x => x.AnnualPrice).GreaterThanOrEqualTo(0).When(x => x.AnnualPrice.HasValue);
        RuleFor(x => x.MaxStudents).GreaterThan(0).When(x => x.MaxStudents.HasValue);
        RuleFor(x => x.MaxAdmins).GreaterThan(0).When(x => x.MaxAdmins.HasValue);
        RuleFor(x => x.MaxInstructors).GreaterThan(0).When(x => x.MaxInstructors.HasValue);
        RuleFor(x => x.MaxExams).GreaterThan(0).When(x => x.MaxExams.HasValue);
        RuleFor(x => x.MaxQuestions).GreaterThan(0).When(x => x.MaxQuestions.HasValue);
        RuleFor(x => x.MaxAiQuestionsPerMonth).GreaterThan(0).When(x => x.MaxAiQuestionsPerMonth.HasValue);
        RuleFor(x => x.StorageGb).GreaterThan(0).When(x => x.StorageGb.HasValue);
    }
}

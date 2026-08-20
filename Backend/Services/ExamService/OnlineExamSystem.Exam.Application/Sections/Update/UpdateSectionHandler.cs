using FluentValidation;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Enums;

namespace OnlineExamSystem.Exam.Application.Sections.Update;

public class UpdateSectionHandler
{
    private readonly IExamRepository _examRepository;
    private readonly IValidator<UpdateSectionCommand> _validator;

    public UpdateSectionHandler(IExamRepository examRepository, IValidator<UpdateSectionCommand> validator)
    {
        _examRepository = examRepository;
        _validator = validator;
    }

    public async Task<UpdateSectionResult> HandleAsync(
        UpdateSectionCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return UpdateSectionResult.Invalid(errors);
        }

        var section = await _examRepository.GetSectionByIdAsync(command.SectionId, cancellationToken);
        if (section is null)
        {
            return UpdateSectionResult.NotFound();
        }

        section.Name = command.Name;
        section.Description = command.Description;
        section.Instructions = command.Instructions;
        section.DisplayOrder = command.DisplayOrder;
        section.QuestionCount = command.QuestionCount;
        section.Marks = command.Marks;
        section.DurationMinutes = command.DurationMinutes;
        section.NavigationType = Enum.Parse<NavigationType>(command.NavigationType, ignoreCase: true);
        section.NegativeMarkingEnabled = command.NegativeMarkingEnabled;
        section.NegativeMarks = command.NegativeMarks;
        section.ShuffleQuestions = command.ShuffleQuestions;
        section.ShuffleOptions = command.ShuffleOptions;
        section.AllowReview = command.AllowReview;

        await _examRepository.SaveChangesAsync(cancellationToken);

        return UpdateSectionResult.Ok(section);
    }
}

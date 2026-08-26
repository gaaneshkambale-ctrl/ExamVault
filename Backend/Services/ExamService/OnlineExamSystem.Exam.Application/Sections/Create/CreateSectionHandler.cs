using FluentValidation;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;

namespace OnlineExamSystem.Exam.Application.Sections.Create;

public class CreateSectionHandler
{
    private readonly IExamRepository _examRepository;
    private readonly IValidator<CreateSectionCommand> _validator;

    public CreateSectionHandler(IExamRepository examRepository, IValidator<CreateSectionCommand> validator)
    {
        _examRepository = examRepository;
        _validator = validator;
    }

    public async Task<CreateSectionResult> HandleAsync(
        CreateSectionCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return CreateSectionResult.Invalid(errors);
        }

        var exam = await _examRepository.GetByIdAsync(command.ExamId, cancellationToken);
        if (exam is null)
        {
            return CreateSectionResult.ExamNotFound();
        }

        var section = new Section
        {
            ExamId = command.ExamId,
            Name = command.Name,
            Description = command.Description,
            Instructions = command.Instructions,
            DisplayOrder = command.DisplayOrder,
            QuestionCount = command.QuestionCount,
            Marks = command.Marks,
            DurationMinutes = command.DurationMinutes,
            NavigationType = Enum.Parse<NavigationType>(command.NavigationType, ignoreCase: true),
            NegativeMarkingEnabled = command.NegativeMarkingEnabled,
            NegativeMarks = command.NegativeMarks,
            ShuffleQuestions = command.ShuffleQuestions,
            ShuffleOptions = command.ShuffleOptions,
            AllowReview = command.AllowReview,
        };

        await _examRepository.AddSectionAsync(section, cancellationToken);
        await _examRepository.SaveChangesAsync(cancellationToken);

        return CreateSectionResult.Ok(section);
    }
}

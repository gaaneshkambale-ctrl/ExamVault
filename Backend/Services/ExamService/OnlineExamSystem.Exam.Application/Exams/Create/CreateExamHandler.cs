using FluentValidation;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;

namespace OnlineExamSystem.Exam.Application.Exams.Create;

public class CreateExamHandler
{
    private readonly IExamRepository _examRepository;
    private readonly IValidator<CreateExamCommand> _validator;

    public CreateExamHandler(IExamRepository examRepository, IValidator<CreateExamCommand> validator)
    {
        _examRepository = examRepository;
        _validator = validator;
    }

    public async Task<CreateExamResult> HandleAsync(
        CreateExamCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return CreateExamResult.Invalid(errors);
        }

        var exam = new ExamPaper
        {
            Title = command.Title,
            ExamCode = string.IsNullOrWhiteSpace(command.ExamCode) ? null : command.ExamCode.Trim(),
            Description = command.Description,
            Category = command.Category,
            ContainsSections = command.ContainsSections,
            ExamType = Enum.Parse<ExamType>(command.ExamType, ignoreCase: true),
            DurationMinutes = command.DurationMinutes,
            TotalMarks = command.TotalMarks,
            PassingMarks = command.PassingMarks,
            Instructions = command.Instructions,
            CreatedByUserId = command.CreatedByUserId,
        };

        await _examRepository.AddAsync(exam, cancellationToken);
        await _examRepository.SaveChangesAsync(cancellationToken);

        return CreateExamResult.Ok(exam);
    }
}

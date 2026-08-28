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

        if (command.ExamTypeId is { } examTypeId &&
            await _examRepository.GetExamTypeByIdAsync(examTypeId, cancellationToken) is null)
        {
            return CreateExamResult.Invalid(["Exam type not found."]);
        }

        var exam = new ExamPaper
        {
            Title = command.Title,
            Description = command.Description,
            Category = command.Category,
            Tags = command.Tags,
            ContainsSections = command.ContainsSections,
            CreationMethod = Enum.Parse<CreationMethod>(command.CreationMethod, ignoreCase: true),
            ExamTypeId = command.ExamTypeId,
            DurationMinutes = command.DurationMinutes,
            TotalMarks = command.TotalMarks,
            PassingMarks = command.PassingMarks,
            Instructions = command.Instructions,
            CreatedByUserId = command.CreatedByUserId,
        };
        exam.ExamCode = GenerateExamCode(command.Category, exam.Id);

        await _examRepository.AddAsync(exam, cancellationToken);
        await _examRepository.SaveChangesAsync(cancellationToken);

        return CreateExamResult.Ok(exam);
    }

    /// <summary>Admins no longer type an Exam Code - it's derived from the exam's own
    /// newly-assigned Id, which is already unique, so this needs no DB round-trip or
    /// counter table and can never collide.</summary>
    private static string GenerateExamCode(string category, Guid examId)
    {
        var prefix = new string(category.Where(char.IsLetter).Take(3).ToArray()).ToUpperInvariant();
        if (prefix.Length == 0)
        {
            prefix = "EXM";
        }

        var suffix = examId.ToString("N")[..6].ToUpperInvariant();
        return $"{prefix}-{DateTime.UtcNow.Year}-{suffix}";
    }
}

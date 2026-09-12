using FluentValidation;
using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.ExamTypes.Create;

public class CreateExamTypeHandler
{
    private readonly IExamRepository _examRepository;
    private readonly IValidator<CreateExamTypeCommand> _validator;

    public CreateExamTypeHandler(IExamRepository examRepository, IValidator<CreateExamTypeCommand> validator)
    {
        _examRepository = examRepository;
        _validator = validator;
    }

    public async Task<CreateExamTypeResult> HandleAsync(
        CreateExamTypeCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return CreateExamTypeResult.Invalid(errors);
        }

        var existingCodes = (await _examRepository.GetAllExamTypesAsync(cancellationToken)).Select(t => t.Code);
        var code = ExamTypeCodeGenerator.Generate(command.Name, existingCodes);

        var examType = new Domain.Entities.ExamType
        {
            Name = command.Name,
            Code = code,
            IsActive = true,
            Purpose = command.Purpose,
            DefaultDurationMinutes = command.DefaultDurationMinutes,
            PassingScorePercent = command.PassingScorePercent,
            DefaultMaxAttempts = command.DefaultMaxAttempts,
            NegativeMarkingEnabled = command.NegativeMarkingEnabled,
            NegativeMarkingValue = command.NegativeMarkingValue,
            AutoSubmitEnabled = command.AutoSubmitEnabled,
        };

        await _examRepository.AddExamTypeAsync(examType, cancellationToken);
        await _examRepository.SaveChangesAsync(cancellationToken);

        return CreateExamTypeResult.Ok(examType);
    }
}

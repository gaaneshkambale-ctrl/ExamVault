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

        var examType = new Domain.Entities.ExamType
        {
            Name = command.Name,
            Purpose = command.Purpose,
        };

        await _examRepository.AddExamTypeAsync(examType, cancellationToken);
        await _examRepository.SaveChangesAsync(cancellationToken);

        return CreateExamTypeResult.Ok(examType);
    }
}

using FluentValidation;
using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.ExamTypes.Update;

public class UpdateExamTypeHandler
{
    private readonly IExamRepository _examRepository;
    private readonly IValidator<UpdateExamTypeCommand> _validator;

    public UpdateExamTypeHandler(IExamRepository examRepository, IValidator<UpdateExamTypeCommand> validator)
    {
        _examRepository = examRepository;
        _validator = validator;
    }

    public async Task<UpdateExamTypeResult> HandleAsync(
        UpdateExamTypeCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return UpdateExamTypeResult.Invalid(errors);
        }

        var examType = await _examRepository.GetExamTypeByIdAsync(command.ExamTypeId, cancellationToken);
        if (examType is null)
        {
            return UpdateExamTypeResult.NotFound();
        }

        examType.Name = command.Name;
        examType.Purpose = command.Purpose;

        await _examRepository.SaveChangesAsync(cancellationToken);

        return UpdateExamTypeResult.Ok(examType);
    }
}

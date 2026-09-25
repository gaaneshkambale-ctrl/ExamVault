using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.AcademicLists.Delete;

public class DeleteAcademicListItemHandler
{
    private readonly IAcademicListItemRepository _repository;

    public DeleteAcademicListItemHandler(IAcademicListItemRepository repository)
    {
        _repository = repository;
    }

    public async Task<DeleteAcademicListItemResult> HandleAsync(
        DeleteAcademicListItemCommand command,
        CancellationToken cancellationToken = default)
    {
        var item = await _repository.GetByIdAsync(command.Id, cancellationToken);
        if (item is null)
        {
            return DeleteAcademicListItemResult.NotFound();
        }

        // Cascade: removing a Program/Department/Semester also removes
        // everything defined beneath it - the FK is Restrict, so this has to
        // happen in application code (see GetDescendantsInclusiveAsync).
        var toDelete = await _repository.GetDescendantsInclusiveAsync(item, cancellationToken);
        await _repository.RemoveRangeAsync(toDelete, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return DeleteAcademicListItemResult.Ok();
    }
}

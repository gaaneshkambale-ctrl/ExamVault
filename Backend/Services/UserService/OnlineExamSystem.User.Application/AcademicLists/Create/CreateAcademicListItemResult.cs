using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.AcademicLists.Create;

public class CreateAcademicListItemResult
{
    public bool Success { get; init; }
    public bool IsConflict { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public AcademicListItem? Item { get; init; }

    public static CreateAcademicListItemResult Ok(AcademicListItem item) => new() { Success = true, Item = item };

    public static CreateAcademicListItemResult Invalid(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };

    public static CreateAcademicListItemResult Conflict() => new() { IsConflict = true };
}

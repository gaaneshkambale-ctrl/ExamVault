namespace OnlineExamSystem.User.Application.AcademicLists.Delete;

public class DeleteAcademicListItemResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }

    public static DeleteAcademicListItemResult Ok() => new() { Success = true };

    public static DeleteAcademicListItemResult NotFound() => new() { IsNotFound = true };
}

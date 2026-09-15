namespace OnlineExamSystem.User.Application.AcademicLists;

// The fixed 4-level hierarchy every AcademicListItem belongs to - Program is
// top-level (no parent), each other level's parent must be an item of the
// listed type. Shared by CreateAcademicListItemValidator/Handler for
// structural validation.
public static class AcademicListHierarchy
{
    public const string Program = "Program";
    public const string Department = "Department";
    public const string Semester = "Semester";
    public const string Division = "Division";

    public static readonly IReadOnlyDictionary<string, string?> ParentListTypeByType = new Dictionary<string, string?>
    {
        [Program] = null,
        [Department] = Program,
        [Semester] = Department,
        [Division] = Semester,
    };

    public static bool IsValidListType(string listType) => ParentListTypeByType.ContainsKey(listType);
}

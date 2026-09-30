namespace OnlineExamSystem.Shared.Contracts.Responses.User;

// Deliberately narrower than UserListItemResponse - this is what
// GET /api/users/students returns to Instructor (who has no "Users - View"
// permission and must never see other Admins/Instructors' identities), so
// it carries only what an "assign this exam to students" picker or a
// student-attempt list's name/avatar lookup needs. AcademicFields was added
// for Student Reports' export (Program/Department/Semester/Division) - it's
// the student's OWN academic classification, not another staff member's
// identity, so it doesn't reopen the privacy gap this DTO exists to close;
// null for a student with none set, same "never fake it" convention
// UserListItemResponse already uses.
public record StudentSummaryResponse(
    Guid Id,
    string FullName,
    string Email,
    string? RollNumber,
    bool HasPhoto = false,
    Dictionary<string, string>? AcademicFields = null);

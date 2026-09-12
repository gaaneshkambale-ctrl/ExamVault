namespace OnlineExamSystem.Shared.Contracts.Responses.User;

// Deliberately narrower than UserListItemResponse - this is what
// GET /api/users/students returns to Instructor (who has no "Users - View"
// permission and must never see other Admins/Instructors' identities), so
// it carries only what an "assign this exam to students" picker or a
// student-attempt list's name/avatar lookup needs.
public record StudentSummaryResponse(
    Guid Id,
    string FullName,
    string Email,
    string? RollNumber,
    bool HasPhoto = false);

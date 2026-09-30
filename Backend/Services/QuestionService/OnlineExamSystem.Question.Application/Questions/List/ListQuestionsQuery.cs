namespace OnlineExamSystem.Question.Application.Questions.List;

// OwnerUserId is non-null only for an Instructor caller - filters the
// returned list to questions they personally created, leaving everyone
// else's (Admin/SuperAdmin/Student, who use this to list an exam's full
// question set) unrestricted.
public record ListQuestionsQuery(
    Guid ExamId,
    Guid? SectionId = null,
    bool UnassignedOnly = false,
    Guid? OwnerUserId = null);

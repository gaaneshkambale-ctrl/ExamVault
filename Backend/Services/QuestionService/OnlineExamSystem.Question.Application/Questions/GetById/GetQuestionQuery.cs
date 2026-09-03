namespace OnlineExamSystem.Question.Application.Questions.GetById;

// OwnerUserId is non-null only for an Instructor caller - Admin/SuperAdmin/
// Student (who reads questions while taking an exam) pass null for
// unrestricted access, matching the pattern ExamsController/GetExamQuery
// already use for Instructor exam ownership.
public record GetQuestionQuery(Guid Id, Guid? OwnerUserId = null);

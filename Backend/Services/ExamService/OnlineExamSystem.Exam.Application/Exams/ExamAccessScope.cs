namespace OnlineExamSystem.Exam.Application.Exams;

// Instructor ownership (added alongside the existing role+permission gate):
// an Instructor may only list/view exams they created themselves, never
// every exam in the tenant like Admin/SuperAdmin can. Student keeps its
// pre-existing "published + assigned to me" scope, unrelated to ownership.
public enum ExamAccessScope
{
    AssignedPublishedOnly,
    OwnedOnly,
    All,
}

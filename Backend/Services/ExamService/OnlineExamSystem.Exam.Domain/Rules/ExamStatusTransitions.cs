using OnlineExamSystem.Exam.Domain.Enums;

namespace OnlineExamSystem.Exam.Domain.Rules;

public static class ExamStatusTransitions
{
    public static bool CanTransition(ExamStatus from, ExamStatus to) => (from, to) switch
    {
        (ExamStatus.Draft, ExamStatus.Published) => true,
        (ExamStatus.Published, ExamStatus.Draft) => true,
        (ExamStatus.Draft, ExamStatus.Archived) => true,
        (ExamStatus.Published, ExamStatus.Archived) => true,
        _ => false,
    };
}

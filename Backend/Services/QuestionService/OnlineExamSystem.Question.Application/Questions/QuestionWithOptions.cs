using OnlineExamSystem.Question.Domain.Entities;

namespace OnlineExamSystem.Question.Application.Questions;

public record QuestionWithOptions(
    ExamQuestion Question,
    IReadOnlyList<QuestionOption> Options,
    IReadOnlyList<QuestionParameter>? Parameters = null,
    IReadOnlyList<QuestionTestCase>? TestCases = null,
    IReadOnlyList<QuestionSqlTestCase>? SqlTestCases = null);

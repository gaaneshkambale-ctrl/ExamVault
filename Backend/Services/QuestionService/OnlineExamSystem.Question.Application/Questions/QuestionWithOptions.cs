using OnlineExamSystem.Question.Domain.Entities;

namespace OnlineExamSystem.Question.Application.Questions;

public record QuestionWithOptions(ExamQuestion Question, IReadOnlyList<QuestionOption> Options);

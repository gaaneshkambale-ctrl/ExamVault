using OnlineExamSystem.Question.Domain.Enums;
using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Question.Domain.Entities;

public class ExamQuestion : BaseEntity
{
    public Guid ExamId { get; set; }
    public Guid? SectionId { get; set; }
    public QuestionType QuestionType { get; set; } = QuestionType.MultipleChoice;
    public string QuestionText { get; set; } = string.Empty;
    public int Marks { get; set; }
    public QuestionDifficulty Difficulty { get; set; } = QuestionDifficulty.Medium;
    public bool ShuffleOptions { get; set; }
    public Guid CreatedByUserId { get; set; }

    // Code/Programming questions only - null for every other type. StarterCode
    // is the boilerplate shown to the student; SampleAnswer is a reference
    // solution shown ONLY to the grading admin, never returned to a student.
    public string? StarterCode { get; set; }
    public string? ProgrammingLanguage { get; set; }
    public bool AllowLanguageChange { get; set; }
    public string? SampleAnswer { get; set; }

    // Auto-grading capability, additive on top of the fields above - when
    // FunctionName/ReturnType are both set (and Parameters/TestCases
    // populated), this question is auto-graded by running the student's
    // function against every TestCase; StarterCode is then a generated
    // per-language stub, not admin-typed free text. When these stay null,
    // the question behaves exactly as it always has: free-text StarterCode,
    // manual grading only.
    public string? FunctionName { get; set; }
    public ParameterType? ReturnType { get; set; }
}

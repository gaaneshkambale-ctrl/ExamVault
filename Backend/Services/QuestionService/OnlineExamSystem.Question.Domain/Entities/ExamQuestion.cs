using OnlineExamSystem.Question.Domain.Enums;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Question.Domain.Entities;

public class ExamQuestion : TenantScopedEntity
{
    public Guid ExamId { get; set; }
    public Guid? SectionId { get; set; }
    public QuestionType QuestionType { get; set; } = QuestionType.MultipleChoice;
    public string QuestionText { get; set; } = string.Empty;
    public int Marks { get; set; }
    public QuestionDifficulty Difficulty { get; set; } = QuestionDifficulty.Medium;
    public bool ShuffleOptions { get; set; }
    public Guid CreatedByUserId { get; set; }

    // Set only when this question was copied in from the Question Bank
    // (BankQuestion.Id). Traceability + usage counts only: deliberately not a
    // foreign key, so deleting or editing the bank question never touches an
    // exam that already has its copy.
    public Guid? SourceBankQuestionId { get; set; }

    // Per-question override of the section/exam negative-marking setting: when
    // set, THIS many marks are deducted for a wrong (answered) response and the
    // section/exam value is ignored. Null = inherit. Only choice questions are
    // penalised (unanswered and code questions never are). Set today only by
    // copying in a bank question that has negative marks above 0.
    public decimal? NegativeMarks { get; set; }

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

    // Code/Programming questions only - illustrative example shown to the
    // student alongside the problem statement (distinct from TestCases,
    // which drive grading). Constraints is one bullet per line when
    // rendered; the student view labels it "Constraints" or "Notes"
    // depending on ProgrammingLanguage, but it is the same field either way.
    public string? SampleInput { get; set; }
    public string? SampleOutput { get; set; }
    public string? Constraints { get; set; }
}

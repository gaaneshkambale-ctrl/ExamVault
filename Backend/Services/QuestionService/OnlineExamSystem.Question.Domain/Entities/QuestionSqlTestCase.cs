using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Question.Domain.Entities;

// One seeded database for a Sql question's Run Code / auto-grading harness.
// SetupSql is schema + seed data (CREATE TABLE/INSERT), run fresh before
// both the reference query (ExamQuestion.SampleAnswer) and the student's
// submitted query - the expected result is never hand-typed, it's always
// derived by actually running the reference query against this same setup.
public class QuestionSqlTestCase : BaseEntity
{
    public Guid QuestionId { get; set; }
    public string SetupSql { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }

    // Precomputed by running the reference query (ExamQuestion.SampleAnswer)
    // against SetupSql when the admin saves the question - shown to students
    // up front, before they run anything. Null when it hasn't been computed
    // yet or the reference query failed to run (never a stale/hand-typed
    // value - a save always recomputes it fresh).
    public string? ExpectedOutput { get; set; }
}

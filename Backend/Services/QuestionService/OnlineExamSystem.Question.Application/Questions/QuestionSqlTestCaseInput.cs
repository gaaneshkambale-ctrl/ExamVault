namespace OnlineExamSystem.Question.Application.Questions;

// SetupSql is raw schema+seed-data text - no arguments/expectedOutput here
// since a Sql question's expected result is always derived by running the
// reference query (SampleAnswer) against this same setup, never hand-typed.
public record QuestionSqlTestCaseInput(string SetupSql);

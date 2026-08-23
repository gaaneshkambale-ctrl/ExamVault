using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Question.Domain.Entities;

// One typed input/output pair for a CodeProgram question's function-
// signature harness. ArgumentsJson is a JSON array with one element per
// question Parameter, in DisplayOrder - e.g. "[[12,35,1,10,34,1]]" for a
// single IntArray parameter. ExpectedOutputJson is a single JSON-encoded
// value matching the question's ReturnType - e.g. "34". Never parsed at
// student-code-run time - the Execution Service renders these as literal
// source-code values into a generated driver ahead of the sandboxed run.
public class QuestionTestCase : BaseEntity
{
    public Guid QuestionId { get; set; }
    public string ArgumentsJson { get; set; } = "[]";
    public string ExpectedOutputJson { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
}

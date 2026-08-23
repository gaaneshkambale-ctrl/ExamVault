using OnlineExamSystem.Question.Domain.Enums;
using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Question.Domain.Entities;

// One entry per parameter of a CodeProgram question's function signature -
// e.g. FunctionName "secondLargest" with a single QuestionParameter
// {Name: "arr", Type: IntArray}. Order matters: DisplayOrder is also the
// argument order the generated driver calls the student's function with.
public class QuestionParameter : BaseEntity
{
    public Guid QuestionId { get; set; }
    public string Name { get; set; } = string.Empty;
    public ParameterType Type { get; set; }
    public int DisplayOrder { get; set; }
}

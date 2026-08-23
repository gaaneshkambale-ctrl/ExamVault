namespace OnlineExamSystem.Execution.Domain;

// Mirrors OnlineExamSystem.Question.Domain.Enums.ParameterType by name (not
// shared directly - services don't share Domain types, only DTOs via
// Shared.Contracts). Values arrive here as strings from Question Service's
// QuestionResponse and are parsed by name, so the two enums must stay in sync.
public enum ParameterType
{
    Int,
    Long,
    Double,
    Boolean,
    String,
    IntArray,
    DoubleArray,
    StringArray,
}

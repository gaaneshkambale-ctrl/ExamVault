namespace OnlineExamSystem.Question.Application.Questions;

// Arguments[i] and ExpectedOutput are each raw JSON text for one typed
// value - e.g. Arguments = ["[12,35,1,10,34,1]"] for a single IntArray
// parameter, ExpectedOutput = "34" for an Int return type.
public record QuestionTestCaseInput(IReadOnlyList<string> Arguments, string ExpectedOutput);

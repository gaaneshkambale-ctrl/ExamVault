namespace OnlineExamSystem.Ai.Domain;

public class DraftQuestion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string QuestionType { get; set; } = string.Empty;
    public string QuestionText { get; set; } = string.Empty;
    public int Marks { get; set; }
    public string Difficulty { get; set; } = string.Empty;
    public List<DraftQuestionOption> Options { get; set; } = [];
}

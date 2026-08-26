namespace OnlineExamSystem.Execution.Application.Sql;

public record RunSqlCommand(Guid QuestionId, string StudentQuery, string BearerToken);

namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record GroupResponse(Guid Id, string Name, int MemberCount, DateTime CreatedAtUtc);

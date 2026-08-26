namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record GroupDetailResponse(Guid Id, string Name, DateTime CreatedAtUtc, IReadOnlyList<Guid> MemberUserIds);

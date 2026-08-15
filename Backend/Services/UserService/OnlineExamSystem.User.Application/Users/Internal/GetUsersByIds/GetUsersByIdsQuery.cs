namespace OnlineExamSystem.User.Application.Users.Internal.GetUsersByIds;

public record GetUsersByIdsQuery(IReadOnlyList<Guid> UserIds);

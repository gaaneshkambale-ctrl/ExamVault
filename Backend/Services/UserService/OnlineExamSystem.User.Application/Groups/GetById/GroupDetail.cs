using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Groups.GetById;

public record GroupDetail(Group Group, IReadOnlyList<Guid> MemberUserIds);

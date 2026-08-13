using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Groups;

public record GroupWithMemberCount(Group Group, int MemberCount);

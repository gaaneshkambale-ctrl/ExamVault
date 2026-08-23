namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record TenantResponse(Guid Id, string Name, string Slug, bool IsActive, DateTime CreatedAtUtc);

using Microsoft.AspNetCore.Authorization;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Ai.API.Authorization;

public static class PermissionPolicies
{
    public const string QuestionsCreate = "Permission:Questions-Create";

    public static void AddPermissionPolicies(this AuthorizationOptions options)
    {
        options.AddPolicy(QuestionsCreate, policy => policy.RequireAssertion(context =>
            context.User.IsInRole("SuperAdmin") ||
            context.User.HasClaim(PermissionClaimTypes.Permission, "Questions - Create")));
    }
}

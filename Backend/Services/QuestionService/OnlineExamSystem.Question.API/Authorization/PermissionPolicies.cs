using Microsoft.AspNetCore.Authorization;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Question.API.Authorization;

public static class PermissionPolicies
{
    public const string QuestionsCreate = "Permission:Questions-Create";
    public const string QuestionsEdit = "Permission:Questions-Edit";

    public static void AddPermissionPolicies(this AuthorizationOptions options)
    {
        options.AddPolicy(QuestionsCreate, policy => policy.RequireAssertion(context =>
            context.User.IsInRole("SuperAdmin") ||
            context.User.HasClaim(PermissionClaimTypes.Permission, "Questions - Create")));
        options.AddPolicy(QuestionsEdit, policy => policy.RequireAssertion(context =>
            context.User.IsInRole("SuperAdmin") ||
            context.User.HasClaim(PermissionClaimTypes.Permission, "Questions - Edit")));
    }
}

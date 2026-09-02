using Microsoft.AspNetCore.Authorization;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Exam.API.Authorization;

public static class PermissionPolicies
{
    public const string ExamsCreate = "Permission:Exams-Create";
    public const string ExamsEdit = "Permission:Exams-Edit";

    public static void AddPermissionPolicies(this AuthorizationOptions options)
    {
        options.AddPolicy(ExamsCreate, policy => policy.RequireAssertion(context =>
            context.User.IsInRole("SuperAdmin") ||
            context.User.HasClaim(PermissionClaimTypes.Permission, "Exams - Create")));
        options.AddPolicy(ExamsEdit, policy => policy.RequireAssertion(context =>
            context.User.IsInRole("SuperAdmin") ||
            context.User.HasClaim(PermissionClaimTypes.Permission, "Exams - Edit")));
    }
}

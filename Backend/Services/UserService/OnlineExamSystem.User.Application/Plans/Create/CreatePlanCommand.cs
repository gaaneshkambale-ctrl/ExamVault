using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.User.Application.Plans.Create;

public record CreatePlanCommand(string Name, string? Description, IReadOnlyList<PlanFeature> IncludedFeatures);

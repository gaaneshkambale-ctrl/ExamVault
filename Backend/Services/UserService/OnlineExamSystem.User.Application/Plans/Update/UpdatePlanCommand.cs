using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.User.Application.Plans.Update;

public record UpdatePlanCommand(Guid PlanId, string Name, string? Description, IReadOnlyList<PlanFeature> IncludedFeatures);

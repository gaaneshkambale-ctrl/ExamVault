using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Notification.Domain.Entities;

// One row per email that submitted the marketing site's "Stay Updated"
// newsletter form (Footer.tsx). BaseEntity, not TenantScopedEntity - a
// newsletter subscriber is a marketing-site visitor, not a tenant user, so
// there's no tenant to scope this to (same reasoning as EmailDeliveryLog).
public class NewsletterSubscriber : BaseEntity
{
    public required string Email { get; set; }
}

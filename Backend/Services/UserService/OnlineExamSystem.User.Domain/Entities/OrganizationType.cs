using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.User.Domain.Entities;

// Platform-wide, Super Admin-managed options for the "Institution Type"
// dropdown on Tenant.OrganizationType (stored as free text there - see
// Tenant.cs). Not a foreign key: deactivating or deleting a row here never
// touches any tenant's already-stored value, it only changes what shows up
// in the dropdown going forward.
public class OrganizationType : BaseEntity
{
    public required string Name { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public Guid? UpdatedByUserId { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

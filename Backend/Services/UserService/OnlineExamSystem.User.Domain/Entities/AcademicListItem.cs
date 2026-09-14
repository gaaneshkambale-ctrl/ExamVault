using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.User.Domain.Entities;

// One row per Program/Department/Semester/Division value a tenant has
// defined for its Academic Configuration - hierarchical via ParentId
// (Program -> Department -> Semester -> Division; Program is top-level, so
// its ParentId is always null). Consumed as cascading select dropdowns on
// Student Academic Details (Create/Edit User) and Exam academic fields
// (Create/Edit Exam) instead of free text - see
// Frontend/.../components/AcademicHierarchySelects.tsx. The allowed
// ListType values and their parent relationship live in
// AcademicListHierarchy (Application layer), not here.
public class AcademicListItem : TenantScopedEntity
{
    public required string ListType { get; set; }
    public required string Value { get; set; }
    public Guid? ParentId { get; set; }
}

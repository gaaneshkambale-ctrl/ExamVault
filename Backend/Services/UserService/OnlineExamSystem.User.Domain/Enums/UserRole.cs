namespace OnlineExamSystem.User.Domain.Enums;

public enum UserRole
{
    Student = 0,
    Admin = 1,

    // Platform-level role that manages tenants themselves, distinct from a
    // tenant's own Admin who only manages their own org. Assigned to the
    // reserved "Platform" tenant (see TenantConstants) for consistency, but
    // its endpoints bypass the per-tenant filter that applies to Admin.
    SuperAdmin = 2,

    // Creates/edits exams and questions, and views results for exams they
    // teach - a scoped subset of Admin's capabilities within a tenant.
    Instructor = 3,
}

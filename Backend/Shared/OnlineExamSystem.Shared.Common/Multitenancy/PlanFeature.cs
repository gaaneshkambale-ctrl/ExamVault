namespace OnlineExamSystem.Shared.Common.Multitenancy;

// The 8 gateable Admin console modules (mirrors the Admin sidebar's own
// groups - Dashboard is deliberately excluded, every org always has it).
// Shared (not per-service) for the same reason as TenantClaimTypes: every
// microservice that gates on this needs the exact same names, since the
// value travels as a JWT claim string embedded by User Service at
// login/refresh and read independently by each service's own JWT
// validation - nothing round-trips back to User Service per request.
public enum PlanFeature
{
    Users = 0,
    Exams = 1,
    ExamTypes = 2,
    LiveMonitoring = 3,
    Results = 4,
    Reports = 5,
    Notifications = 6,
    Settings = 7,
}

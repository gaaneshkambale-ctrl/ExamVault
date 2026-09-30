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
    // Narrowed 2026-09-04 to just real-time non-video oversight (Active
    // Exams, Student Attempts, admin intervention) - Security Violations
    // and camera-based Proctoring split out into their own features below
    // so they can be granted/revoked independently (see ActionPlan.txt's
    // "SPLIT LiveMonitoring" plan for why - one bundled switch made a
    // revoked-Proctoring org keep full Security Violations access, and
    // vice versa).
    LiveMonitoring = 3,
    Results = 4,
    Reports = 5,
    Notifications = 6,
    Settings = 7,
    // Non-video browser/security controls and violation tracking - split
    // out of LiveMonitoring 2026-09-04. Appended at the end rather than
    // inserted near LiveMonitoring: storage is by enum NAME (see
    // Plan.IncludedFeatures' ValueConverter), not numeric value, so
    // position is cosmetic only, but keeping existing members' values
    // stable avoids any doubt.
    ExamSecurity = 8,
    // Webcam/live-video/recording - the privacy-sensitive, premium tier
    // split out of LiveMonitoring 2026-09-04.
    Proctoring = 9,
}

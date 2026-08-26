namespace OnlineExamSystem.Notification.Domain.Enums;

// Results is intentionally unwired for now - ResultService has no stateful
// "publish" action to hook (results are computed on demand), so nothing
// writes this value yet. Kept in the enum for forward-compatibility.
public enum AuditModule
{
    Auth,
    Users,
    Exams,
    Questions,
    Results,
    Security,
}

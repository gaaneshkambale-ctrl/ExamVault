namespace OnlineExamSystem.Result.Application.Interfaces;

/// <summary>Mints a short-lived, service-to-service JWT ResultService uses
/// to call SubmissionService's Admin/Instructor-only endpoints on a
/// student's own behalf (eg. to compute their Rank/Percentile) - never
/// derived from the calling student's own token, which could never pass
/// those endpoints' role checks itself. See the Infrastructure
/// implementation's own doc comment for the full reasoning.</summary>
public interface ISystemTokenProvider
{
    string CreateToken(Guid tenantId);
}

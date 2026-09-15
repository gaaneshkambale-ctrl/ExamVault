namespace OnlineExamSystem.Shared.Contracts.Requests.User;

// TrialEndsAtUtc is required (and must be in the future) when IsTrial is
// true; ending a trial (IsTrial = false) ignores it and always clears it.
public record SetTenantTrialRequest(bool IsTrial, DateTime? TrialEndsAtUtc = null);

namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record UpdateMyProfileRequest(
    string FullName,
    string? PhoneNumber = null,
    string? Username = null,
    string? AlternateEmail = null,
    string? Gender = null,
    DateTime? DateOfBirth = null,
    string? Location = null,
    string? Department = null,
    string? Designation = null);

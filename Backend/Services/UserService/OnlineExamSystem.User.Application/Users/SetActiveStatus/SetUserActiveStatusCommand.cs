namespace OnlineExamSystem.User.Application.Users.SetActiveStatus;

public record SetUserActiveStatusCommand(Guid UserId, bool IsActive);

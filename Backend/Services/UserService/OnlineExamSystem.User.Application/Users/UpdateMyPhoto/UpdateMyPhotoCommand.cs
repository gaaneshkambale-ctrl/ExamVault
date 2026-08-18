namespace OnlineExamSystem.User.Application.Users.UpdateMyPhoto;

public record UpdateMyPhotoCommand(Guid UserId, byte[] PhotoData, string ContentType);

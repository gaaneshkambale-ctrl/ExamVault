namespace OnlineExamSystem.User.Application.Users.UpdateMyPhoto;

public class UpdateMyPhotoResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }

    public static UpdateMyPhotoResult Ok() => new() { Success = true };

    public static UpdateMyPhotoResult NotFound() => new() { Success = false, IsNotFound = true };
}

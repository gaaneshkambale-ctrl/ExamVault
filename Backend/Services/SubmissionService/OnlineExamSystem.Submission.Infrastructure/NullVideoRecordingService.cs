using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Infrastructure;

// Registered in place of MeteredVideoRecordingService whenever Metered:ApiKey
// / Metered:AppDomain aren't configured, so a missing/misconfigured video
// provider degrades to "no recording" instead of breaking every exam start.
public class NullVideoRecordingService : IVideoRecordingService
{
    public Task<bool> EnsureRoomExistsAsync(string roomName, CancellationToken cancellationToken = default) =>
        Task.FromResult(false);

    public Task<string?> CreateJoinTokenAsync(
        string roomName,
        Guid userId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<string?>(null);

    public string GetRoomUrl(string roomName) => string.Empty;
}

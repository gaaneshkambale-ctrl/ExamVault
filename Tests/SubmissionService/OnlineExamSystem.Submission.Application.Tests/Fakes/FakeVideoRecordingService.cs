using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Application.Tests.Fakes;

public class FakeVideoRecordingService : IVideoRecordingService
{
    private readonly bool _ensureRoomSucceeds;
    private readonly string? _token;

    public List<string> EnsuredRooms { get; } = [];
    public List<(string RoomName, Guid UserId)> TokensCreatedFor { get; } = [];

    public FakeVideoRecordingService(bool ensureRoomSucceeds = true, string? token = "fake-token")
    {
        _ensureRoomSucceeds = ensureRoomSucceeds;
        _token = token;
    }

    public Task<bool> EnsureRoomExistsAsync(string roomName, CancellationToken cancellationToken = default)
    {
        EnsuredRooms.Add(roomName);
        return Task.FromResult(_ensureRoomSucceeds);
    }

    public Task<string?> CreateJoinTokenAsync(
        string roomName,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        TokensCreatedFor.Add((roomName, userId));
        return Task.FromResult(_token);
    }

    public string GetRoomUrl(string roomName) => $"fake.metered.live/{roomName}";
}

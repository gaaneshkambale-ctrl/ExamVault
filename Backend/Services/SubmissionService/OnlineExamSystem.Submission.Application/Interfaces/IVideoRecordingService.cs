namespace OnlineExamSystem.Submission.Application.Interfaces;

// Interface-first, same as IEventPublisher before RabbitMQ - concrete
// implementation (Metered) lives in Infrastructure. A no-op implementation
// is registered instead whenever Metered isn't configured, so recording is
// purely additive: its absence or failure must never block a student's exam.
public interface IVideoRecordingService
{
    // Idempotent by design - safe to call every time a student (re)joins
    // their exam, whether or not the room already exists from an earlier
    // call on the same attempt. Returns false only on a genuine failure
    // (network/config problem), never throws.
    Task<bool> EnsureRoomExistsAsync(string roomName, CancellationToken cancellationToken = default);

    Task<string?> CreateJoinTokenAsync(
        string roomName,
        Guid userId,
        CancellationToken cancellationToken = default);

    // Pure/deterministic - no network call, never fails. The room's join
    // URL is fully computable from config once the room name is known.
    string GetRoomUrl(string roomName);
}

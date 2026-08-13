using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Application.Notifications.Admin.CreateNotification;
using OnlineExamSystem.Notification.Application.Tests.Fakes;

namespace OnlineExamSystem.Notification.Application.Tests;

public class CreateNotificationHandlerTests
{
    private static readonly Guid StudentA = Guid.NewGuid();
    private static readonly Guid StudentB = Guid.NewGuid();
    private static readonly Guid AdminA = Guid.NewGuid();

    private static readonly List<UserDirectoryEntry> AllUsers =
    [
        new(StudentA, "studentA@example.com", "Student A", "Student"),
        new(StudentB, "studentB@example.com", "Student B", "Student"),
        new(AdminA, "adminA@example.com", "Admin A", "Admin"),
    ];

    private static CreateNotificationHandler CreateHandler(
        FakeNotificationPersistenceService persistenceService,
        IReadOnlyList<Guid>? examCandidateIds = null) =>
        new(
            new FakeUserDirectoryClient(AllUsers),
            new FakeExamAssignmentLookupClient(examCandidateIds ?? []),
            persistenceService,
            new CreateNotificationValidator());

    private static CreateNotificationCommand Command(
        string sendTo, IReadOnlyList<Guid>? userIds = null, Guid? relatedExamId = null) => new(
        Title: "Title",
        Message: "Message",
        Type: "System",
        SendTo: sendTo,
        UserIds: userIds,
        RelatedExamId: relatedExamId,
        SendNow: true,
        ScheduledAtUtc: null,
        AdminUserId: Guid.NewGuid(),
        BearerToken: "test-token");

    [Fact]
    public async Task AllStudents_resolves_only_student_role_users()
    {
        var persistenceService = new FakeNotificationPersistenceService();
        var handler = CreateHandler(persistenceService);

        var result = await handler.HandleAsync(Command("AllStudents"));

        Assert.True(result.Success);
        Assert.Equal(2, result.RecipientCount);
        var recipientIds = persistenceService.Calls.Single().Recipients.Select(r => r.UserId).ToHashSet();
        Assert.Equal(new HashSet<Guid> { StudentA, StudentB }, recipientIds);
    }

    [Fact]
    public async Task Admins_resolves_only_admin_role_users()
    {
        var persistenceService = new FakeNotificationPersistenceService();
        var handler = CreateHandler(persistenceService);

        var result = await handler.HandleAsync(Command("Admins"));

        Assert.True(result.Success);
        Assert.Equal(1, result.RecipientCount);
        Assert.Equal(AdminA, persistenceService.Calls.Single().Recipients.Single().UserId);
    }

    [Fact]
    public async Task SelectedStudents_resolves_only_the_given_user_ids()
    {
        var persistenceService = new FakeNotificationPersistenceService();
        var handler = CreateHandler(persistenceService);

        var result = await handler.HandleAsync(Command("SelectedStudents", userIds: [StudentA]));

        Assert.True(result.Success);
        Assert.Equal(1, result.RecipientCount);
        Assert.Equal(StudentA, persistenceService.Calls.Single().Recipients.Single().UserId);
    }

    [Fact]
    public async Task ExamCandidates_resolves_via_the_assignment_lookup_client()
    {
        var persistenceService = new FakeNotificationPersistenceService();
        var examId = Guid.NewGuid();
        var handler = CreateHandler(persistenceService, examCandidateIds: [StudentB]);

        var result = await handler.HandleAsync(Command("ExamCandidates", relatedExamId: examId));

        Assert.True(result.Success);
        Assert.Equal(1, result.RecipientCount);
        Assert.Equal(StudentB, persistenceService.Calls.Single().Recipients.Single().UserId);
    }

    [Fact]
    public async Task No_matching_recipients_returns_no_recipients_result()
    {
        var persistenceService = new FakeNotificationPersistenceService();
        var handler = CreateHandler(persistenceService);

        var result = await handler.HandleAsync(Command("SelectedStudents", userIds: [Guid.NewGuid()]));

        Assert.True(result.IsNoRecipients);
        Assert.Empty(persistenceService.Calls);
    }

    [Fact]
    public async Task Missing_title_fails_validation_before_resolving_recipients()
    {
        var persistenceService = new FakeNotificationPersistenceService();
        var handler = CreateHandler(persistenceService);
        var command = Command("AllStudents") with { Title = "" };

        var result = await handler.HandleAsync(command);

        Assert.NotEmpty(result.ValidationErrors);
        Assert.Empty(persistenceService.Calls);
    }

    [Fact]
    public async Task Selected_students_with_no_user_ids_fails_validation()
    {
        var persistenceService = new FakeNotificationPersistenceService();
        var handler = CreateHandler(persistenceService);

        var result = await handler.HandleAsync(Command("SelectedStudents", userIds: []));

        Assert.NotEmpty(result.ValidationErrors);
    }
}

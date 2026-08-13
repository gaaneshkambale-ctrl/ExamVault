using OnlineExamSystem.Exam.Application.Assignments.Create;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class CreateAssignmentHandlerTests
{
    private static CreateAssignmentHandler CreateHandler(
        FakeExamRepository repository,
        IUserLookupClient? userLookupClient = null) =>
        new(
            repository,
            userLookupClient ?? new FakeUserLookupClient(result: null),
            new CreateAssignmentValidator(),
            new FakeEventPublisher());

    private static CreateAssignmentCommand StudentsCommand(Guid examId, params Guid[] userIds) => new(
        examId,
        "Students",
        userIds,
        GroupId: null,
        StartAtUtc: DateTime.UtcNow,
        EndAtUtc: DateTime.UtcNow.AddDays(1),
        TimeZoneId: "UTC",
        MaxAttempts: 1,
        AllowLateJoin: false,
        GraceTimeMinutes: 0,
        ShowInstructions: true,
        ShowResultsAfterSubmit: false,
        ShowCorrectAnswers: false,
        AllowReviewAfterSubmit: false,
        AutoSubmitOnTimeOver: true,
        EnableProctoring: false,
        BearerToken: "test-token");

    [Fact]
    public async Task Valid_students_request_assigns_every_selected_student()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals", Status = ExamStatus.Published };
        await repository.AddAsync(exam);
        var studentA = Guid.NewGuid();
        var studentB = Guid.NewGuid();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(StudentsCommand(exam.Id, studentA, studentB));

        Assert.True(result.Success);
        Assert.Equal(2, result.TargetUserIds.Count);
        Assert.Single(repository.Assignments);
        Assert.Equal(2, repository.Targets.Count);
    }

    [Fact]
    public async Task Valid_batch_request_assigns_every_group_member()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals", Status = ExamStatus.Published };
        await repository.AddAsync(exam);
        var groupId = Guid.NewGuid();
        var memberA = Guid.NewGuid();
        var memberB = Guid.NewGuid();
        var handler = CreateHandler(
            repository,
            new FakeUserLookupClient(new GroupMembersResult(groupId, [memberA, memberB])));

        var command = StudentsCommand(exam.Id) with { TargetType = "Batch", GroupId = groupId, UserIds = null };
        var result = await handler.HandleAsync(command);

        Assert.True(result.Success);
        Assert.Equal(2, result.TargetUserIds.Count);
        Assert.Equal(groupId, result.Assignment!.GroupId);
    }

    [Fact]
    public async Task Valid_all_students_request_assigns_every_student_in_the_system()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals", Status = ExamStatus.Published };
        await repository.AddAsync(exam);
        var studentA = Guid.NewGuid();
        var studentB = Guid.NewGuid();
        var handler = CreateHandler(
            repository,
            new FakeUserLookupClient(result: null, allStudentUserIds: [studentA, studentB]));

        var command = StudentsCommand(exam.Id) with { TargetType = "AllStudents", UserIds = null };
        var result = await handler.HandleAsync(command);

        Assert.True(result.Success);
        Assert.Equal(2, result.TargetUserIds.Count);
    }

    [Fact]
    public async Task Unknown_group_returns_not_found()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals", Status = ExamStatus.Published };
        await repository.AddAsync(exam);
        var handler = CreateHandler(repository, new FakeUserLookupClient(result: null));

        var command = StudentsCommand(exam.Id) with { TargetType = "Batch", GroupId = Guid.NewGuid(), UserIds = null };
        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.True(result.IsGroupNotFound);
        Assert.Empty(repository.Assignments);
    }

    [Fact]
    public async Task Unknown_exam_returns_not_found()
    {
        var repository = new FakeExamRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(StudentsCommand(Guid.NewGuid(), Guid.NewGuid()));

        Assert.False(result.Success);
        Assert.True(result.IsExamNotFound);
    }

    [Fact]
    public async Task Draft_exam_is_rejected()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals", Status = ExamStatus.Draft };
        await repository.AddAsync(exam);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(StudentsCommand(exam.Id, Guid.NewGuid()));

        Assert.False(result.Success);
        Assert.True(result.IsExamNotPublished);
        Assert.Empty(repository.Assignments);
    }

    [Fact]
    public async Task Students_target_type_with_no_selected_students_fails_validation()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals", Status = ExamStatus.Published };
        await repository.AddAsync(exam);
        var handler = CreateHandler(repository);

        var command = StudentsCommand(exam.Id) with { UserIds = Array.Empty<Guid>() };
        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.NotEmpty(result.ValidationErrors);
    }

    [Fact]
    public async Task End_date_before_start_date_fails_validation()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals", Status = ExamStatus.Published };
        await repository.AddAsync(exam);
        var handler = CreateHandler(repository);

        var command = StudentsCommand(exam.Id, Guid.NewGuid()) with
        {
            StartAtUtc = DateTime.UtcNow,
            EndAtUtc = DateTime.UtcNow.AddDays(-1),
        };
        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.NotEmpty(result.ValidationErrors);
    }
}

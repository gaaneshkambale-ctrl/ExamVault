using OnlineExamSystem.Exam.Application.Assignments.Update;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class UpdateAssignmentHandlerTests
{
    private static UpdateAssignmentCommand StudentsCommand(Guid assignmentId, params Guid[] userIds) => new(
        assignmentId,
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
        EnableLiveVideo: false,
        BearerToken: "test-token");

    private static async Task<(FakeExamRepository Repository, ExamAssignment Assignment)> SeedAssignment()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals", Status = ExamStatus.Published };
        await repository.AddAsync(exam);
        var assignment = new ExamAssignment { ExamId = exam.Id, TargetType = AssignmentTargetType.Students };
        await repository.AddAssignmentAsync(assignment, [Guid.NewGuid()]);
        return (repository, assignment);
    }

    [Fact]
    public async Task Retargeting_to_own_tenant_students_succeeds()
    {
        var (repository, assignment) = await SeedAssignment();
        var handler = new UpdateAssignmentHandler(repository, new FakeUserLookupClient(result: null), new UpdateAssignmentValidator());

        var result = await handler.HandleAsync(StudentsCommand(assignment.Id, Guid.NewGuid(), Guid.NewGuid()));

        Assert.True(result.Success);
    }

    [Fact]
    public async Task Retargeting_to_another_tenants_student_is_rejected()
    {
        var (repository, assignment) = await SeedAssignment();
        var otherTenantStudent = Guid.NewGuid();
        var handler = new UpdateAssignmentHandler(
            repository,
            new FakeUserLookupClient(result: null, foreignUserIds: new HashSet<Guid> { otherTenantStudent }),
            new UpdateAssignmentValidator());

        var result = await handler.HandleAsync(StudentsCommand(assignment.Id, Guid.NewGuid(), otherTenantStudent));

        Assert.False(result.Success);
        Assert.NotEmpty(result.ValidationErrors);
    }
}

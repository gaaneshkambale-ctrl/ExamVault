using OnlineExamSystem.Exam.Application.Assignments.Mine;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class GetMyAssignmentForExamHandlerTests
{
    [Fact]
    public async Task Returns_the_callers_assignment_for_the_exam()
    {
        var repository = new FakeExamRepository();
        var examId = Guid.NewGuid();
        var studentId = Guid.NewGuid();
        var assignment = new ExamAssignment
        {
            ExamId = examId,
            StartAtUtc = new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc),
            EndAtUtc = new DateTime(2026, 8, 21, 10, 0, 0, DateTimeKind.Utc),
        };
        repository.SeedAssignment(assignment, [studentId]);
        var handler = new GetMyAssignmentForExamHandler(repository);

        var result = await handler.HandleAsync(new GetMyAssignmentForExamQuery(examId, studentId));

        Assert.NotNull(result);
        Assert.Equal(assignment.StartAtUtc, result!.StartAtUtc);
        Assert.Equal(assignment.EndAtUtc, result.EndAtUtc);
    }

    [Fact]
    public async Task Returns_null_when_the_caller_has_no_assignment_for_the_exam()
    {
        var repository = new FakeExamRepository();
        var handler = new GetMyAssignmentForExamHandler(repository);

        var result = await handler.HandleAsync(new GetMyAssignmentForExamQuery(Guid.NewGuid(), Guid.NewGuid()));

        Assert.Null(result);
    }

    [Fact]
    public async Task Does_not_return_another_students_assignment()
    {
        var repository = new FakeExamRepository();
        var examId = Guid.NewGuid();
        var otherStudentId = Guid.NewGuid();
        repository.SeedAssignment(new ExamAssignment { ExamId = examId }, [otherStudentId]);
        var handler = new GetMyAssignmentForExamHandler(repository);

        var result = await handler.HandleAsync(new GetMyAssignmentForExamQuery(examId, Guid.NewGuid()));

        Assert.Null(result);
    }
}

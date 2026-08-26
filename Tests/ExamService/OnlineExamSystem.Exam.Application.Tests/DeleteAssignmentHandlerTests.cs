using OnlineExamSystem.Exam.Application.Assignments.Delete;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class DeleteAssignmentHandlerTests
{
    [Fact]
    public async Task Valid_request_removes_the_assignment_and_its_targets()
    {
        var repository = new FakeExamRepository();
        var assignment = new ExamAssignment { ExamId = Guid.NewGuid() };
        var studentId = Guid.NewGuid();
        repository.SeedAssignment(assignment, [studentId]);
        var handler = new DeleteAssignmentHandler(repository);

        var result = await handler.HandleAsync(new DeleteAssignmentCommand(assignment.Id));

        Assert.True(result.Success);
        Assert.Empty(repository.Assignments);
        Assert.Empty(repository.Targets);
    }

    [Fact]
    public async Task Unknown_assignment_returns_not_found()
    {
        var repository = new FakeExamRepository();
        var handler = new DeleteAssignmentHandler(repository);

        var result = await handler.HandleAsync(new DeleteAssignmentCommand(Guid.NewGuid()));

        Assert.False(result.Success);
        Assert.True(result.IsNotFound);
    }
}

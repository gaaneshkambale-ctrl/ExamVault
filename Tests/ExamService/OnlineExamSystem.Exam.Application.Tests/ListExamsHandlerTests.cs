using OnlineExamSystem.Exam.Application.Exams.List;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class ListExamsHandlerTests
{
    private static readonly Guid StudentId = Guid.NewGuid();
    private static readonly Guid OtherStudentId = Guid.NewGuid();

    [Fact]
    public async Task Admin_sees_every_exam_regardless_of_status_or_assignment()
    {
        var repository = new FakeExamRepository();
        var draft = new ExamPaper { Title = "Draft Exam", Status = ExamStatus.Draft, CreatedAtUtc = DateTime.UtcNow.AddMinutes(-10) };
        var published = new ExamPaper { Title = "Published Exam", Status = ExamStatus.Published, CreatedAtUtc = DateTime.UtcNow };
        await repository.AddAsync(draft);
        await repository.AddAsync(published);
        var handler = new ListExamsHandler(repository);

        var result = await handler.HandleAsync(new ListExamsQuery(Guid.NewGuid(), IsAdmin: true));

        Assert.Equal(2, result.Count);
        Assert.Equal("Published Exam", result[0].Title);
        Assert.Equal("Draft Exam", result[1].Title);
    }

    [Fact]
    public async Task Student_only_sees_published_exams_they_are_assigned_to()
    {
        var repository = new FakeExamRepository();
        var assignedPublished = new ExamPaper { Title = "Assigned Published", Status = ExamStatus.Published };
        var assignedDraft = new ExamPaper { Title = "Assigned Draft", Status = ExamStatus.Draft };
        var unassignedPublished = new ExamPaper { Title = "Unassigned Published", Status = ExamStatus.Published };
        await repository.AddAsync(assignedPublished);
        await repository.AddAsync(assignedDraft);
        await repository.AddAsync(unassignedPublished);
        repository.SeedAssignment(new ExamAssignment { ExamId = assignedPublished.Id }, [StudentId]);
        repository.SeedAssignment(new ExamAssignment { ExamId = assignedDraft.Id }, [StudentId]);
        repository.SeedAssignment(new ExamAssignment { ExamId = unassignedPublished.Id }, [OtherStudentId]);
        var handler = new ListExamsHandler(repository);

        var result = await handler.HandleAsync(new ListExamsQuery(StudentId, IsAdmin: false));

        Assert.Single(result);
        Assert.Equal("Assigned Published", result[0].Title);
    }

    [Fact]
    public async Task Empty_repository_returns_empty_list()
    {
        var repository = new FakeExamRepository();
        var handler = new ListExamsHandler(repository);

        var result = await handler.HandleAsync(new ListExamsQuery(Guid.NewGuid(), IsAdmin: true));

        Assert.Empty(result);
    }
}

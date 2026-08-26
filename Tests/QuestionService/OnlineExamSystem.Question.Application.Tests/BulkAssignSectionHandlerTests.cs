using OnlineExamSystem.Question.Application.Questions.BulkAssignSection;
using OnlineExamSystem.Question.Application.Tests.Fakes;
using OnlineExamSystem.Question.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.Question.Application.Tests;

public class BulkAssignSectionHandlerTests
{
    [Fact]
    public async Task Selected_questions_get_the_target_section_id()
    {
        var repository = new FakeQuestionRepository();
        var examId = Guid.NewGuid();
        var q1 = new ExamQuestion { ExamId = examId, QuestionText = "Q1" };
        var q2 = new ExamQuestion { ExamId = examId, QuestionText = "Q2" };
        await repository.AddAsync(q1, []);
        await repository.AddAsync(q2, []);
        var sectionId = Guid.NewGuid();
        var handler = new BulkAssignSectionHandler(repository);

        await handler.HandleAsync(new BulkAssignSectionCommand(sectionId, [q1.Id, q2.Id]));

        Assert.Equal(sectionId, repository.Questions.Single(q => q.Id == q1.Id).SectionId);
        Assert.Equal(sectionId, repository.Questions.Single(q => q.Id == q2.Id).SectionId);
    }

    [Fact]
    public async Task Null_section_id_unassigns_the_questions()
    {
        var repository = new FakeQuestionRepository();
        var examId = Guid.NewGuid();
        var sectionId = Guid.NewGuid();
        var q1 = new ExamQuestion { ExamId = examId, QuestionText = "Q1", SectionId = sectionId };
        await repository.AddAsync(q1, []);
        var handler = new BulkAssignSectionHandler(repository);

        await handler.HandleAsync(new BulkAssignSectionCommand(null, [q1.Id]));

        Assert.Null(repository.Questions.Single(q => q.Id == q1.Id).SectionId);
    }
}

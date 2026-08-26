using OnlineExamSystem.Exam.Application.Sections.GetOrCreateDefault;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class GetOrCreateDefaultSectionHandlerTests
{
    [Fact]
    public async Task Exam_with_no_sections_gets_a_default_section_created()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "No sections yet", DurationMinutes = 45 };
        await repository.AddAsync(exam);
        var handler = new GetOrCreateDefaultSectionHandler(repository);

        var section = await handler.HandleAsync(new GetOrCreateDefaultSectionQuery(exam.Id));

        Assert.NotNull(section);
        Assert.Equal(exam.Id, section!.ExamId);
        Assert.Single(repository.Sections);
        Assert.Equal(45, section.DurationMinutes);
    }

    [Fact]
    public async Task Exam_with_an_existing_section_reuses_it_instead_of_creating_another()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "Already sectioned" };
        await repository.AddAsync(exam);
        var existing = new Section { ExamId = exam.Id, Name = "Section 1", DisplayOrder = 0 };
        await repository.AddSectionAsync(existing);
        var handler = new GetOrCreateDefaultSectionHandler(repository);

        var section = await handler.HandleAsync(new GetOrCreateDefaultSectionQuery(exam.Id));

        Assert.Equal(existing.Id, section!.Id);
        Assert.Single(repository.Sections);
    }

    [Fact]
    public async Task Unknown_exam_returns_null()
    {
        var repository = new FakeExamRepository();
        var handler = new GetOrCreateDefaultSectionHandler(repository);

        var section = await handler.HandleAsync(new GetOrCreateDefaultSectionQuery(Guid.NewGuid()));

        Assert.Null(section);
    }
}

using OnlineExamSystem.Exam.Application.Sections;
using OnlineExamSystem.Exam.Application.Sections.Reorder;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class ReorderSectionsHandlerTests
{
    [Fact]
    public async Task Sections_are_reordered_by_id()
    {
        var repository = new FakeExamRepository();
        var examId = Guid.NewGuid();
        var first = new Section { ExamId = examId, Name = "First", DisplayOrder = 0 };
        var second = new Section { ExamId = examId, Name = "Second", DisplayOrder = 1 };
        await repository.AddSectionAsync(first);
        await repository.AddSectionAsync(second);
        var handler = new ReorderSectionsHandler(repository);

        await handler.HandleAsync(new ReorderSectionsCommand(
            examId,
            [new SectionOrderEntry(first.Id, 1), new SectionOrderEntry(second.Id, 0)]));

        Assert.Equal(1, first.DisplayOrder);
        Assert.Equal(0, second.DisplayOrder);
    }

    [Fact]
    public async Task Sections_belonging_to_a_different_exam_are_untouched()
    {
        var repository = new FakeExamRepository();
        var otherExamSection = new Section { ExamId = Guid.NewGuid(), Name = "Other", DisplayOrder = 0 };
        await repository.AddSectionAsync(otherExamSection);
        var handler = new ReorderSectionsHandler(repository);

        await handler.HandleAsync(new ReorderSectionsCommand(
            Guid.NewGuid(),
            [new SectionOrderEntry(otherExamSection.Id, 5)]));

        Assert.Equal(0, otherExamSection.DisplayOrder);
    }
}

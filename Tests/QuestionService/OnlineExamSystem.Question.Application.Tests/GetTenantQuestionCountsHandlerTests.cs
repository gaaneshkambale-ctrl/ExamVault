using OnlineExamSystem.Question.Application.Questions.TenantCounts;
using OnlineExamSystem.Question.Application.Tests.Fakes;
using OnlineExamSystem.Question.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.Question.Application.Tests;

public class GetTenantQuestionCountsHandlerTests
{
    [Fact]
    public async Task Returns_one_count_per_tenant_and_no_question_content()
    {
        var repository = new FakeQuestionRepository();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        await repository.AddAsync(new ExamQuestion { TenantId = tenantA, QuestionText = "a1" }, []);
        await repository.AddAsync(new ExamQuestion { TenantId = tenantA, QuestionText = "a2" }, []);
        await repository.AddAsync(new ExamQuestion { TenantId = tenantB, QuestionText = "b1" }, []);

        var counts = await new GetTenantQuestionCountsHandler(repository).HandleAsync();

        Assert.Equal(2, counts.Count);
        Assert.Equal(2, counts.Single(c => c.TenantId == tenantA).ExamQuestionCount);
        Assert.Equal(1, counts.Single(c => c.TenantId == tenantB).ExamQuestionCount);
    }

    [Fact]
    public async Task No_questions_means_no_rows()
    {
        var counts = await new GetTenantQuestionCountsHandler(new FakeQuestionRepository()).HandleAsync();

        Assert.Empty(counts);
    }
}

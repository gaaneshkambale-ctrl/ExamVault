using OnlineExamSystem.Question.Application.Questions.List;
using OnlineExamSystem.Question.Application.Tests.Fakes;
using OnlineExamSystem.Question.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.Question.Application.Tests;

public class ListQuestionsHandlerTests
{
    [Fact]
    public async Task Returns_only_questions_for_the_requested_exam_with_their_options()
    {
        var repository = new FakeQuestionRepository();
        var examId = Guid.NewGuid();
        var otherExamId = Guid.NewGuid();

        var matching = new ExamQuestion
        {
            ExamId = examId,
            QuestionText = "In this exam",
            CreatedAtUtc = DateTime.UtcNow,
        };
        var matchingOptions = new List<QuestionOption>
        {
            new() { QuestionId = matching.Id, OptionText = "A", IsCorrect = true, DisplayOrder = 0 },
        };
        await repository.AddAsync(matching, matchingOptions);

        var other = new ExamQuestion { ExamId = otherExamId, QuestionText = "In another exam" };
        await repository.AddAsync(other, []);

        var handler = new ListQuestionsHandler(repository);

        var result = await handler.HandleAsync(new ListQuestionsQuery(examId));

        var entry = Assert.Single(result);
        Assert.Equal("In this exam", entry.Question.QuestionText);
        Assert.Single(entry.Options);
    }

    [Fact]
    public async Task Exam_with_no_questions_returns_empty_list()
    {
        var repository = new FakeQuestionRepository();
        var handler = new ListQuestionsHandler(repository);

        var result = await handler.HandleAsync(new ListQuestionsQuery(Guid.NewGuid()));

        Assert.Empty(result);
    }
}

using OnlineExamSystem.Question.Application.Questions.DeleteForExam;
using OnlineExamSystem.Question.Application.Tests.Fakes;
using OnlineExamSystem.Question.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.Question.Application.Tests;

public class DeleteForExamHandlerTests
{
    [Fact]
    public async Task Every_question_belonging_to_the_exam_is_deleted()
    {
        var repository = new FakeQuestionRepository();
        var examId = Guid.NewGuid();
        var otherExamId = Guid.NewGuid();
        var question1 = new ExamQuestion { ExamId = examId, QuestionText = "Q1" };
        var question2 = new ExamQuestion { ExamId = examId, QuestionText = "Q2" };
        var otherExamQuestion = new ExamQuestion { ExamId = otherExamId, QuestionText = "Keep me" };
        await repository.AddAsync(question1, []);
        await repository.AddAsync(question2, []);
        await repository.AddAsync(otherExamQuestion, []);
        var handler = new DeleteForExamHandler(repository);

        await handler.HandleAsync(new DeleteForExamCommand(examId));

        Assert.Single(repository.Questions);
        Assert.Equal(otherExamId, repository.Questions[0].ExamId);
    }

    [Fact]
    public async Task Exam_with_no_questions_is_a_no_op()
    {
        var repository = new FakeQuestionRepository();
        var handler = new DeleteForExamHandler(repository);

        await handler.HandleAsync(new DeleteForExamCommand(Guid.NewGuid()));

        Assert.Empty(repository.Questions);
    }
}

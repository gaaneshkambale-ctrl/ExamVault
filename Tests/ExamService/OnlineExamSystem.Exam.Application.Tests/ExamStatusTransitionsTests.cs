using OnlineExamSystem.Exam.Domain.Enums;
using OnlineExamSystem.Exam.Domain.Rules;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class ExamStatusTransitionsTests
{
    [Theory]
    [InlineData(ExamStatus.Draft, ExamStatus.Published)]
    [InlineData(ExamStatus.Published, ExamStatus.Draft)]
    [InlineData(ExamStatus.Draft, ExamStatus.Archived)]
    [InlineData(ExamStatus.Published, ExamStatus.Archived)]
    public void Allowed_transitions_return_true(ExamStatus from, ExamStatus to)
    {
        Assert.True(ExamStatusTransitions.CanTransition(from, to));
    }

    [Theory]
    [InlineData(ExamStatus.Archived, ExamStatus.Draft)]
    [InlineData(ExamStatus.Archived, ExamStatus.Published)]
    [InlineData(ExamStatus.Draft, ExamStatus.Draft)]
    [InlineData(ExamStatus.Published, ExamStatus.Published)]
    [InlineData(ExamStatus.Archived, ExamStatus.Archived)]
    public void Disallowed_transitions_return_false(ExamStatus from, ExamStatus to)
    {
        Assert.False(ExamStatusTransitions.CanTransition(from, to));
    }
}

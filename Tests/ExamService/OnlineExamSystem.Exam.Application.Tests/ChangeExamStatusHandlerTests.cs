using OnlineExamSystem.Exam.Application.Exams.ChangeStatus;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class ChangeExamStatusHandlerTests
{
    [Fact]
    public async Task Draft_to_published_succeeds_when_section_totals_match()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper
        {
            Title = "C# Fundamentals",
            Status = ExamStatus.Draft,
            ContainsSections = true,
            DurationMinutes = 20,
            TotalMarks = 20,
            PassingMarks = 10,
        };
        await repository.AddAsync(exam);
        await repository.AddSectionAsync(new Section
        {
            ExamId = exam.Id,
            QuestionCount = 10,
            Marks = 20,
            DurationMinutes = 20,
        });
        var questionServiceClient = new FakeQuestionServiceClient();
        questionServiceClient.QuestionCountsByExamId[exam.Id] = 10;
        var handler = new ChangeExamStatusHandler(repository, questionServiceClient);

        var result = await handler.HandleAsync(new ChangeExamStatusCommand(exam.Id, ExamStatus.Published));

        Assert.True(result.Success);
        Assert.Equal(ExamStatus.Published, result.Exam!.Status);
    }

    [Fact]
    public async Task Publish_is_blocked_when_exam_has_no_real_questions()
    {
        // Even a non-sectioned exam (which skips the section-totals check entirely) must
        // still be blocked from publishing with zero real questions in Question Service.
        var repository = new FakeExamRepository();
        var exam = new ExamPaper
        {
            Title = "Empty Exam",
            Status = ExamStatus.Draft,
            ContainsSections = false,
            DurationMinutes = 30,
            TotalMarks = 10,
            PassingMarks = 4,
        };
        await repository.AddAsync(exam);
        var questionServiceClient = new FakeQuestionServiceClient();
        var handler = new ChangeExamStatusHandler(repository, questionServiceClient);

        var result = await handler.HandleAsync(new ChangeExamStatusCommand(exam.Id, ExamStatus.Published));

        Assert.False(result.Success);
        Assert.NotEmpty(result.ValidationErrors);
        Assert.Equal(ExamStatus.Draft, exam.Status);
    }

    [Fact]
    public async Task Publish_is_blocked_when_section_totals_dont_match_exam_totals()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper
        {
            Title = "C# Fundamentals",
            Status = ExamStatus.Draft,
            ContainsSections = true,
            DurationMinutes = 60,
            TotalMarks = 100,
            PassingMarks = 40,
        };
        await repository.AddAsync(exam);
        await repository.AddSectionAsync(new Section
        {
            ExamId = exam.Id,
            QuestionCount = 10,
            Marks = 20,
            DurationMinutes = 20,
        });
        var handler = new ChangeExamStatusHandler(repository, new FakeQuestionServiceClient());

        var result = await handler.HandleAsync(new ChangeExamStatusCommand(exam.Id, ExamStatus.Published));

        Assert.False(result.Success);
        Assert.False(result.InvalidTransition);
        Assert.False(result.IsNotFound);
        Assert.NotEmpty(result.ValidationErrors);
        Assert.Equal(ExamStatus.Draft, exam.Status);
    }

    [Fact]
    public async Task Publish_is_blocked_when_sectioned_exam_has_no_sections()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals", Status = ExamStatus.Draft, ContainsSections = true };
        await repository.AddAsync(exam);
        var handler = new ChangeExamStatusHandler(repository, new FakeQuestionServiceClient());

        var result = await handler.HandleAsync(new ChangeExamStatusCommand(exam.Id, ExamStatus.Published));

        Assert.False(result.Success);
        Assert.NotEmpty(result.ValidationErrors);
        Assert.Equal(ExamStatus.Draft, exam.Status);
    }

    [Fact]
    public async Task Publish_is_not_blocked_for_non_sectioned_exam_with_mismatched_totals()
    {
        // Non-sectioned exams get an implicit "General" section with Marks/QuestionCount
        // left at 0 (never surfaced to the admin) - the totals check must not apply to them.
        var repository = new FakeExamRepository();
        var exam = new ExamPaper
        {
            Title = "C# Fundamentals",
            Status = ExamStatus.Draft,
            ContainsSections = false,
            DurationMinutes = 60,
            TotalMarks = 100,
            PassingMarks = 40,
        };
        await repository.AddAsync(exam);
        await repository.AddSectionAsync(new Section { ExamId = exam.Id, Name = "General", DurationMinutes = 60 });
        var questionServiceClient = new FakeQuestionServiceClient();
        questionServiceClient.QuestionCountsByExamId[exam.Id] = 1;
        var handler = new ChangeExamStatusHandler(repository, questionServiceClient);

        var result = await handler.HandleAsync(new ChangeExamStatusCommand(exam.Id, ExamStatus.Published));

        Assert.True(result.Success);
        Assert.Equal(ExamStatus.Published, result.Exam!.Status);
    }

    [Fact]
    public async Task Publishing_to_published_status_does_not_block_unpublish()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper
        {
            Title = "C# Fundamentals",
            Status = ExamStatus.Published,
            ContainsSections = true,
            DurationMinutes = 60,
            TotalMarks = 100,
            PassingMarks = 40,
        };
        await repository.AddAsync(exam);
        var handler = new ChangeExamStatusHandler(repository, new FakeQuestionServiceClient());

        var result = await handler.HandleAsync(new ChangeExamStatusCommand(exam.Id, ExamStatus.Draft));

        Assert.True(result.Success);
        Assert.Equal(ExamStatus.Draft, result.Exam!.Status);
    }

    [Fact]
    public async Task Archived_to_published_is_rejected()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals", Status = ExamStatus.Archived };
        await repository.AddAsync(exam);
        var handler = new ChangeExamStatusHandler(repository, new FakeQuestionServiceClient());

        var result = await handler.HandleAsync(new ChangeExamStatusCommand(exam.Id, ExamStatus.Published));

        Assert.False(result.Success);
        Assert.True(result.InvalidTransition);
        Assert.Equal(ExamStatus.Archived, exam.Status);
    }

    [Fact]
    public async Task Unknown_exam_returns_not_found()
    {
        var repository = new FakeExamRepository();
        var handler = new ChangeExamStatusHandler(repository, new FakeQuestionServiceClient());

        var result = await handler.HandleAsync(new ChangeExamStatusCommand(Guid.NewGuid(), ExamStatus.Published));

        Assert.False(result.Success);
        Assert.True(result.IsNotFound);
    }

    [Fact]
    public async Task Owner_instructor_can_publish_their_own_exam()
    {
        var repository = new FakeExamRepository();
        var ownerId = Guid.NewGuid();
        var exam = new ExamPaper
        {
            Title = "C# Fundamentals",
            Status = ExamStatus.Draft,
            ContainsSections = false,
            CreatedByUserId = ownerId,
        };
        await repository.AddAsync(exam);
        var questionServiceClient = new FakeQuestionServiceClient();
        questionServiceClient.QuestionCountsByExamId[exam.Id] = 1;
        var handler = new ChangeExamStatusHandler(repository, questionServiceClient);

        var result = await handler.HandleAsync(
            new ChangeExamStatusCommand(exam.Id, ExamStatus.Published, OwnerUserId: ownerId));

        Assert.True(result.Success);
        Assert.Equal(ExamStatus.Published, result.Exam!.Status);
    }

    [Fact]
    public async Task Non_owner_instructor_cannot_publish_another_instructors_exam()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper
        {
            Title = "C# Fundamentals",
            Status = ExamStatus.Draft,
            CreatedByUserId = Guid.NewGuid(),
        };
        await repository.AddAsync(exam);
        var handler = new ChangeExamStatusHandler(repository, new FakeQuestionServiceClient());

        var result = await handler.HandleAsync(
            new ChangeExamStatusCommand(exam.Id, ExamStatus.Published, OwnerUserId: Guid.NewGuid()));

        Assert.False(result.Success);
        Assert.True(result.IsForbidden);
        Assert.Equal(ExamStatus.Draft, exam.Status);
    }
}

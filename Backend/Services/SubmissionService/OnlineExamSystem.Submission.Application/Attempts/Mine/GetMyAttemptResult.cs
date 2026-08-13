using OnlineExamSystem.Submission.Domain.Entities;

namespace OnlineExamSystem.Submission.Application.Attempts.Mine;

public class GetMyAttemptResult
{
    public ExamAttempt? Attempt { get; init; }
    public IReadOnlyList<AttemptAnswer> Answers { get; init; } = Array.Empty<AttemptAnswer>();

    public static GetMyAttemptResult Found(ExamAttempt attempt, IReadOnlyList<AttemptAnswer> answers) =>
        new() { Attempt = attempt, Answers = answers };

    public static GetMyAttemptResult NotFound() => new();
}

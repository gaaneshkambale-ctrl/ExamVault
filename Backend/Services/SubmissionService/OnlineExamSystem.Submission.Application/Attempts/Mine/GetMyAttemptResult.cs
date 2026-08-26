using OnlineExamSystem.Submission.Domain.Entities;

namespace OnlineExamSystem.Submission.Application.Attempts.Mine;

public class GetMyAttemptResult
{
    public ExamAttempt? Attempt { get; init; }
    public IReadOnlyList<AttemptAnswer> Answers { get; init; } = Array.Empty<AttemptAnswer>();
    public IReadOnlyList<AttemptSectionState> SectionStates { get; init; } = Array.Empty<AttemptSectionState>();

    public static GetMyAttemptResult Found(
        ExamAttempt attempt,
        IReadOnlyList<AttemptAnswer> answers,
        IReadOnlyList<AttemptSectionState> sectionStates) =>
        new() { Attempt = attempt, Answers = answers, SectionStates = sectionStates };

    public static GetMyAttemptResult NotFound() => new();
}

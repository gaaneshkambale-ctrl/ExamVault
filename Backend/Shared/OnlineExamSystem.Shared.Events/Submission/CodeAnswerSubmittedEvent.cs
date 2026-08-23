using OnlineExamSystem.Shared.Events.Base;

namespace OnlineExamSystem.Shared.Events.Submission;

// Published once per CodeProgram answer (any answer with AnswerText set -
// Submission Service doesn't need to know "CodeProgram" as a concept, only
// that this answer is free-text code, same decoupling already used
// elsewhere) after an attempt is submitted. The consumer decides whether
// the question actually has test cases to auto-grade against; a question
// with none is silently skipped (stays manually graded).
public sealed record CodeAnswerSubmittedEvent : IntegrationEvent
{
    public required Guid AttemptId { get; init; }
    public required Guid QuestionId { get; init; }
    public required string AnswerText { get; init; }
}

namespace OnlineExamSystem.Shared.Contracts.Responses.Submission;

public record AttemptWithAnswersResponse(
    ExamAttemptResponse Attempt,
    IReadOnlyList<AttemptAnswerResponse> Answers,
    IReadOnlyList<AttemptSectionStateResponse> SectionStates);

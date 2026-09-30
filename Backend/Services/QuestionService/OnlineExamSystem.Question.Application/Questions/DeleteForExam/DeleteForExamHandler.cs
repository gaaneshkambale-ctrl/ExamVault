using OnlineExamSystem.Question.Application.Interfaces;

namespace OnlineExamSystem.Question.Application.Questions.DeleteForExam;

public class DeleteForExamHandler
{
    private readonly IQuestionRepository _questionRepository;

    public DeleteForExamHandler(IQuestionRepository questionRepository)
    {
        _questionRepository = questionRepository;
    }

    public Task HandleAsync(DeleteForExamCommand command, CancellationToken cancellationToken = default) =>
        _questionRepository.DeleteAllQuestionsForExamAsync(command.ExamId, cancellationToken);
}

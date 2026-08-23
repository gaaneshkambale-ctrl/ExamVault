namespace OnlineExamSystem.Question.Domain.Enums;

public enum QuestionType
{
    MultipleChoice = 0,
    TrueFalse = 1,
    ShortAnswer = 2,
    FillInTheBlank = 3,
    MatchTheFollowing = 4,
    CodeProgram = 5,
    Essay = 6,

    // True "select all that apply" - 2+ correct options, distinct from
    // MultipleChoice (which despite its name only ever allows exactly one
    // correct answer - see the "Single Choice" relabeling).
    MultiSelect = 7,
}

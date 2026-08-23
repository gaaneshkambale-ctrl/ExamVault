namespace OnlineExamSystem.Question.Domain.Enums;

// Deliberately bounded, not "any type" - each value needs a driver-code
// template in every one of the 5 supported programming languages.
public enum ParameterType
{
    Int = 0,
    Long = 1,
    Double = 2,
    Boolean = 3,
    String = 4,
    IntArray = 5,
    DoubleArray = 6,
    StringArray = 7,
}

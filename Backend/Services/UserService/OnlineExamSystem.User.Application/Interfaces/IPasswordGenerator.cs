namespace OnlineExamSystem.User.Application.Interfaces;

public interface IPasswordGenerator
{
    /// <summary>Generates a random password satisfying CreateUserValidator's rules
    /// (8+ chars, at least one uppercase, one lowercase, one digit).</summary>
    string Generate();
}

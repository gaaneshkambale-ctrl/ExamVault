using System.Security.Cryptography;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Infrastructure.Authentication;

public class PasswordGenerator : IPasswordGenerator
{
    private const string Uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private const string Lowercase = "abcdefghijkmnopqrstuvwxyz";
    private const string Digits = "23456789";
    private const string AllChars = Uppercase + Lowercase + Digits;
    private const int Length = 12;

    public string Generate()
    {
        var chars = new char[Length];

        // Guarantee at least one of each required character class up front,
        // then fill the rest randomly, then shuffle so the guaranteed
        // characters aren't always in the same positions.
        chars[0] = RandomChar(Uppercase);
        chars[1] = RandomChar(Lowercase);
        chars[2] = RandomChar(Digits);
        for (var i = 3; i < Length; i++)
        {
            chars[i] = RandomChar(AllChars);
        }

        Shuffle(chars);
        return new string(chars);
    }

    private static char RandomChar(string alphabet) => alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)];

    private static void Shuffle(char[] chars)
    {
        for (var i = chars.Length - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (chars[i], chars[j]) = (chars[j], chars[i]);
        }
    }
}

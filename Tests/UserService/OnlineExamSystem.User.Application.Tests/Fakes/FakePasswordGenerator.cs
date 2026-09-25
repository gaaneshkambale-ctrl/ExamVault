using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tests.Fakes;

public class FakePasswordGenerator : IPasswordGenerator
{
    public string Generate() => "TempPass1";
}

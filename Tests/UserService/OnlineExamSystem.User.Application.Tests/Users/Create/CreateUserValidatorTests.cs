using OnlineExamSystem.User.Application.Users.Create;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests.Users.Create;

// Guards the Add User wizard's mandatory fields server-side, since a direct
// API call bypasses the frontend's own required-field checks.
public class CreateUserValidatorTests
{
    private readonly CreateUserValidator _validator = new();

    private static CreateUserCommand ValidStudentCommand() => new(
        Guid.NewGuid(), "Jane Doe", "jane@example.com", "Student",
        PhoneNumber: "+91 98765 43210",
        RollNumber: "R-001");

    // A tenant Admin can never assign the Admin role itself (only a Super
    // Admin can) - use Instructor as the non-Student baseline for the
    // shared field-validation tests below.
    private static CreateUserCommand ValidInstructorCommand() => new(
        Guid.NewGuid(), "Jane Doe", "jane@example.com", "Instructor",
        PhoneNumber: "+91 98765 43210");

    [Fact]
    public void Rejects_missing_phone_number_for_student()
    {
        var command = ValidStudentCommand() with { PhoneNumber = null };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateUserCommand.PhoneNumber));
    }

    [Fact]
    public void Rejects_missing_phone_number_for_instructor()
    {
        var command = ValidInstructorCommand() with { PhoneNumber = null };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateUserCommand.PhoneNumber));
    }

    [Fact]
    public void Rejects_malformed_phone_number()
    {
        var command = ValidInstructorCommand() with { PhoneNumber = "not-a-phone!!" };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateUserCommand.PhoneNumber));
    }

    [Fact]
    public void Rejects_missing_roll_number_for_student()
    {
        var command = ValidStudentCommand() with { RollNumber = null };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateUserCommand.RollNumber));
    }

    [Fact]
    public void Does_not_require_roll_number_for_instructor()
    {
        var command = ValidInstructorCommand() with { RollNumber = null };

        var result = _validator.Validate(command);

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Accepts_valid_student_command()
    {
        var result = _validator.Validate(ValidStudentCommand());

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Accepts_valid_instructor_command()
    {
        var result = _validator.Validate(ValidInstructorCommand());

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Rejects_admin_role_since_only_a_super_admin_can_assign_it()
    {
        var command = ValidInstructorCommand() with { Role = "Admin" };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateUserCommand.Role));
    }

    [Theory]
    [InlineData("Jane123")]
    [InlineData("123456")]
    [InlineData("J")]
    [InlineData("!!!")]
    public void Rejects_invalid_full_name(string fullName)
    {
        var command = ValidInstructorCommand() with { FullName = fullName };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateUserCommand.FullName));
    }

    [Theory]
    [InlineData("Jean-Luc")]
    [InlineData("O'Brien")]
    [InlineData("A. Sharma")]
    [InlineData("Priya Sharma")]
    public void Accepts_valid_full_name(string fullName)
    {
        var command = ValidInstructorCommand() with { FullName = fullName };

        var result = _validator.Validate(command);

        Assert.True(result.IsValid);
    }
}

using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Question.Application.QuestionBank;
using OnlineExamSystem.Question.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Question.Application.Tests;

// Code/Programming bank questions: validation reuse, Sql expected-output
// precompute, and the copy into an exam.
public partial class QuestionBankServiceTests
{
    private sealed class CannedSqlClient : ISqlExpectedOutputClient
    {
        public string? LastBearer { get; private set; }

        public Task<IReadOnlyList<SqlExpectedOutputResult>> ComputeAsync(
            string referenceQuery,
            IReadOnlyList<string> setupSqlList,
            string bearerToken,
            CancellationToken cancellationToken = default)
        {
            LastBearer = bearerToken;
            return Task.FromResult<IReadOnlyList<SqlExpectedOutputResult>>(
                setupSqlList.Select((_, i) => new SqlExpectedOutputResult(true, $"rows-{i}", null)).ToList());
        }
    }

    private static SaveBankQuestionCommand CodeCommand(Guid subjectId, BankCodeSpec? code = null, string? bearer = null) =>
        new(subjectId, null, "CodeProgram", "Return the second largest number.", null, "Medium", 5, 0, false, "Active", [], [],
            code ?? FunctionSpec(), bearer);

    private static BankCodeSpec FunctionSpec(string? language = "Python") =>
        new(language, "def second_largest(arr):\n    pass", true, "sorted(set(arr))[-2]", "second_largest", "Int",
            "[1,2,3]", "2", "No sorting builtins", [new BankCodeParameter("arr", "IntArray")],
            [new BankCodeTestCase("[[12,35,1,10,34,1]]", "34"), new BankCodeTestCase("[[1,2]]", "1")], []);

    private static BankCodeSpec SqlSpec() =>
        new("Sql", null, false, "SELECT name FROM students WHERE score > 85;", null, null, null, null, null, [], [],
            [new BankCodeSqlTestCase("CREATE TABLE students(name TEXT, score INT); INSERT INTO students VALUES ('a', 90);", null)]);

    [Fact]
    public async Task Function_style_code_question_is_saved_and_round_trips()
    {
        var subject = await SubjectAsync();

        var result = await _service.CreateQuestionAsync(CodeCommand(subject.Id), Teacher, default);

        Assert.Equal(BankOutcome.Ok, result.Outcome);
        Assert.Equal(QuestionType.CodeProgram, result.Value!.Question.QuestionType);
        Assert.Empty(result.Value.Options);
        var spec = BankCodeSpec.FromJson(result.Value.Question.CodeSpecJson)!;
        Assert.Equal("second_largest", spec.FunctionName);
        Assert.Equal(2, spec.TestCases.Count);
        Assert.Equal("[[12,35,1,10,34,1]]", spec.TestCases[0].ArgumentsJson);
    }

    [Fact]
    public async Task Code_question_reuses_the_exam_question_rules()
    {
        var subject = await SubjectAsync();

        var noLanguage = await _service.CreateQuestionAsync(CodeCommand(subject.Id, FunctionSpec(language: null)), Teacher, default);
        var badArgCount = await _service.CreateQuestionAsync(
            CodeCommand(subject.Id, FunctionSpec() with { TestCases = [new BankCodeTestCase("[1,2]", "3")] }), Teacher, default);
        var sqlNoReference = await _service.CreateQuestionAsync(
            CodeCommand(subject.Id, SqlSpec() with { SampleAnswer = null }), Teacher, default);

        Assert.Equal(BankOutcome.Invalid, noLanguage.Outcome);
        Assert.Equal(BankOutcome.Invalid, badArgCount.Outcome);
        Assert.Equal(BankOutcome.Invalid, sqlNoReference.Outcome);
    }

    [Fact]
    public async Task Code_details_are_required_for_code_questions_and_rejected_on_others()
    {
        var subject = await SubjectAsync();

        var missing = await _service.CreateQuestionAsync(CodeCommand(subject.Id) with { Code = null }, Teacher, default);
        var onChoice = await _service.CreateQuestionAsync(Command(subject.Id) with { Code = FunctionSpec() }, Teacher, default);
        var withOptions = await _service.CreateQuestionAsync(
            CodeCommand(subject.Id) with { Options = [new("A", true), new("B", false)] }, Teacher, default);

        Assert.Equal(BankOutcome.Invalid, missing.Outcome);
        Assert.Equal(BankOutcome.Invalid, onChoice.Outcome);
        Assert.Equal(BankOutcome.Invalid, withOptions.Outcome);
    }

    [Fact]
    public async Task Sql_expected_output_is_precomputed_with_the_callers_token_and_stored()
    {
        var subject = await SubjectAsync();

        var result = await _service.CreateQuestionAsync(CodeCommand(subject.Id, SqlSpec(), bearer: "token-123"), Teacher, default);

        Assert.Equal("token-123", _sql.LastBearer);
        Assert.Equal("rows-0", BankCodeSpec.FromJson(result.Value!.Question.CodeSpecJson)!.SqlTestCases[0].ExpectedOutput);
    }

    [Fact]
    public async Task Sql_question_still_saves_without_a_token_just_without_expected_output()
    {
        var subject = await SubjectAsync();

        var result = await _service.CreateQuestionAsync(CodeCommand(subject.Id, SqlSpec()), Teacher, default);

        Assert.Equal(BankOutcome.Ok, result.Outcome);
        Assert.Null(BankCodeSpec.FromJson(result.Value!.Question.CodeSpecJson)!.SqlTestCases[0].ExpectedOutput);
    }

    [Fact]
    public async Task Adding_a_function_code_question_to_an_exam_copies_signature_and_test_cases()
    {
        var subject = await SubjectAsync();
        var bank = (await _service.CreateQuestionAsync(CodeCommand(subject.Id), Teacher, default)).Value!.Question;

        var result = await _service.AddToExamAsync(Guid.NewGuid(), null, [bank.Id], Admin.UserId, default);

        Assert.Equal(1, result.Value!.Added);
        var copy = Assert.Single(_repo.ExamCopies);
        Assert.Equal(QuestionType.CodeProgram, copy.QuestionType);
        Assert.Equal("Python", copy.ProgrammingLanguage);
        Assert.True(copy.AllowLanguageChange);
        Assert.Equal("second_largest", copy.FunctionName);
        Assert.Equal(ParameterType.Int, copy.ReturnType);
        Assert.Equal("sorted(set(arr))[-2]", copy.SampleAnswer);
        var parameter = Assert.Single(_repo.ExamCopyParameters);
        Assert.Equal(copy.Id, parameter.QuestionId);
        Assert.Equal("arr", parameter.Name);
        Assert.Equal(ParameterType.IntArray, parameter.Type);
        Assert.Equal(2, _repo.ExamCopyTestCases.Count(t => t.QuestionId == copy.Id));
        Assert.Equal("[[12,35,1,10,34,1]]", _repo.ExamCopyTestCases.First(t => t.DisplayOrder == 0).ArgumentsJson);
        Assert.Empty(_repo.ExamCopyOptions);
    }

    [Fact]
    public async Task Adding_a_sql_code_question_copies_setup_sql_and_its_precomputed_expected_output()
    {
        var subject = await SubjectAsync();
        var bank = (await _service.CreateQuestionAsync(CodeCommand(subject.Id, SqlSpec(), bearer: "t"), Teacher, default)).Value!.Question;

        await _service.AddToExamAsync(Guid.NewGuid(), null, [bank.Id], Admin.UserId, default);

        var sql = Assert.Single(_repo.ExamCopySqlTestCases);
        Assert.Contains("CREATE TABLE students", sql.SetupSql);
        Assert.Equal("rows-0", sql.ExpectedOutput);
    }

    [Fact]
    public async Task Switching_a_code_question_to_a_choice_question_drops_its_code_details()
    {
        var subject = await SubjectAsync();
        var bank = (await _service.CreateQuestionAsync(CodeCommand(subject.Id), Teacher, default)).Value!.Question;

        var updated = await _service.UpdateQuestionAsync(bank.Id, Command(subject.Id), Teacher, default);

        Assert.Equal(BankOutcome.Ok, updated.Outcome);
        Assert.Null(updated.Value!.Question.CodeSpecJson);
    }
}

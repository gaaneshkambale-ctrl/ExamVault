using OnlineExamSystem.User.Application.Tenants.Create;
using OnlineExamSystem.User.Application.Tests.Fakes;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests.Tenants.Create;

public class CreateTenantHandlerTests
{
    private static CreateTenantHandler CreateHandler(FakeTenantRepository? tenantRepository = null) =>
        new(
            tenantRepository ?? new FakeTenantRepository(),
            new CreateTenantValidator(),
            new FakePlanRepository());

    private static CreateTenantCommand ValidCommand(string name = "Greenfield University", string slug = "greenfield") =>
        new(
            name,
            slug,
            PlanId: null,
            IsTrial: false,
            TrialEndsAtUtc: null,
            OrganizationType: "College",
            AddressLine1: null,
            AddressLine2: null,
            City: null,
            State: null,
            PostalCode: null,
            Country: null,
            CreatedByUserId: Guid.NewGuid());

    [Fact]
    public async Task Valid_command_creates_the_tenant()
    {
        var handler = CreateHandler();

        var result = await handler.HandleAsync(ValidCommand());

        Assert.True(result.Success);
        Assert.Equal("Greenfield University", result.Tenant!.Name);
    }

    [Fact]
    public async Task Duplicate_name_is_rejected_even_with_a_different_slug()
    {
        var repository = new FakeTenantRepository();
        await CreateHandler(repository).HandleAsync(ValidCommand(name: "Greenfield University", slug: "greenfield"));

        var result = await CreateHandler(repository).HandleAsync(
            ValidCommand(name: "Greenfield University", slug: "greenfield-2"));

        Assert.False(result.Success);
        Assert.True(result.NameAlreadyExists);
        Assert.False(result.SlugAlreadyExists);
    }

    [Fact]
    public async Task Duplicate_slug_is_rejected_even_with_a_different_name()
    {
        var repository = new FakeTenantRepository();
        await CreateHandler(repository).HandleAsync(ValidCommand(name: "Greenfield University", slug: "greenfield"));

        var result = await CreateHandler(repository).HandleAsync(
            ValidCommand(name: "A Different University", slug: "greenfield"));

        Assert.False(result.Success);
        Assert.True(result.SlugAlreadyExists);
        Assert.False(result.NameAlreadyExists);
    }

    [Theory]
    [InlineData("platform")]
    [InlineData("api")]
    [InlineData("www")]
    public async Task Reserved_slugs_are_rejected(string reservedSlug)
    {
        var handler = CreateHandler();

        var result = await handler.HandleAsync(ValidCommand(slug: reservedSlug));

        Assert.False(result.Success);
        Assert.Contains(result.ValidationErrors, e => e.Contains("reserved"));
    }

    [Fact]
    public async Task Missing_organization_type_fails_validation()
    {
        var handler = CreateHandler();

        var result = await handler.HandleAsync(ValidCommand() with { OrganizationType = null });

        Assert.False(result.Success);
        Assert.Contains(result.ValidationErrors, e => e.Contains("Organization Type"));
    }
}

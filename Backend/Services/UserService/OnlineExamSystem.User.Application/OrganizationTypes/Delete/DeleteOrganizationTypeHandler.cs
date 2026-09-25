using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.OrganizationTypes.Delete;

public class DeleteOrganizationTypeHandler
{
    private readonly IOrganizationTypeRepository _organizationTypeRepository;

    public DeleteOrganizationTypeHandler(IOrganizationTypeRepository organizationTypeRepository)
    {
        _organizationTypeRepository = organizationTypeRepository;
    }

    public async Task<DeleteOrganizationTypeResult> HandleAsync(
        DeleteOrganizationTypeCommand command,
        CancellationToken cancellationToken = default)
    {
        var organizationType = await _organizationTypeRepository.GetByIdAsync(command.OrganizationTypeId, cancellationToken);
        if (organizationType is null)
        {
            return DeleteOrganizationTypeResult.NoType();
        }

        // No FK to Tenant - OrganizationType on Tenant is stored as free
        // text (see Tenant.cs), so deleting this row can't orphan any
        // reference; a tenant that already picked this value just keeps
        // its stored string, it only stops appearing in the dropdown.
        _organizationTypeRepository.Remove(organizationType);
        await _organizationTypeRepository.SaveChangesAsync(cancellationToken);

        return DeleteOrganizationTypeResult.Ok();
    }
}

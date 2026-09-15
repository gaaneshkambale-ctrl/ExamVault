namespace OnlineExamSystem.User.Application.OrganizationTypes.List;

// ActiveOnly=true for the Admin/Create-Organization dropdown (default);
// false for Super Admin's own management screen, which needs to see and
// re-activate deactivated rows too.
public record ListOrganizationTypesQuery(bool ActiveOnly = true);

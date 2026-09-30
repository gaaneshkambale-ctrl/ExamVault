namespace OnlineExamSystem.User.Application.AcademicLists.List;

// No TenantId - IAcademicListItemRepository reads go through
// AcademicListItem's TenantScopedEntity query filter, same as
// ListGroupsQuery.
public record ListAcademicListItemsQuery(string ListType, Guid? ParentId);

namespace OnlineExamSystem.Shared.Contracts.Requests.Exam;

public record SectionOrderItem(Guid SectionId, int DisplayOrder);

public record ReorderSectionsRequest(IReadOnlyList<SectionOrderItem> Order);

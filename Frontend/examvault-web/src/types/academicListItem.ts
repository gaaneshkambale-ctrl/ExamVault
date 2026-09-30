export type AcademicListType = 'Program' | 'Department' | 'Semester' | 'Division';

export interface AcademicListItem {
  id: string;
  listType: AcademicListType;
  value: string;
  parentId: string | null;
  createdAtUtc: string;
}

export interface CreateAcademicListItemRequest {
  listType: AcademicListType;
  value: string;
  parentId: string | null;
}

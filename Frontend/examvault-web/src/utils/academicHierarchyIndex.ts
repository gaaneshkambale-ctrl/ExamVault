import { getAcademicListItems } from '../api/academicListsApi';
import type { AcademicListItem, AcademicListType } from '../types/academicListItem';
import type { FieldDef } from '../constants/organizationTypeFieldCatalog';

const HIER_ORDER: { key: 'program' | 'department' | 'semester' | 'division'; listType: AcademicListType }[] = [
  { key: 'program', listType: 'Program' },
  { key: 'department', listType: 'Department' },
  { key: 'semester', listType: 'Semester' },
  { key: 'division', listType: 'Division' },
];

// The same mapping, keyed by field key instead of ordered by level - lets a
// caller check "is this catalog field key one of the 4 hierarchy levels"
// without re-deriving HIER_ORDER's own shape.
export const HIER_TYPE_BY_KEY: Record<string, AcademicListType> = Object.fromEntries(
  HIER_ORDER.map((level) => [level.key, level.listType]),
);

// Same filter this org type's catalog already gets in AcademicHierarchyFields.tsx
// (activeLevels) - whichever of program/department/semester/division it
// defines, in that fixed relative order. A catalog missing an earlier level
// (eg. School's lone 'division', with no program/department/semester above
// it) still walks starting from an empty parent - same as the interactive
// picker, which has no earlier level to select either.
export function getActiveHierarchyLevels(fields: FieldDef[]): AcademicListType[] {
  return HIER_ORDER.filter((level) => fields.some((f) => f.key === level.key)).map((level) => level.listType);
}

export type AcademicHierarchyIndex = Partial<Record<AcademicListType, AcademicListItem[]>>;

export const EMPTY_HIERARCHY_INDEX: AcademicHierarchyIndex = {};

// Fetches every item at each active level, level by level - each level's
// fetch is parented by every item found one level up, run in parallel - so
// a whole imported file's Program/Department/Semester/Division values can
// be checked against the tenant's real configured lists in one pass,
// instead of round-tripping per cell. Tenant academic lists are small
// (a handful of programs/departments/semesters/divisions), so this stays
// a handful of parallel batches even for a deep tree.
export async function fetchAcademicHierarchyIndex(activeLevels: AcademicListType[]): Promise<AcademicHierarchyIndex> {
  const index: AcademicHierarchyIndex = {};
  let parentIds: (string | null)[] = [null];
  for (const listType of activeLevels) {
    const results = await Promise.all(parentIds.map((parentId) => getAcademicListItems(listType, parentId)));
    const items = results.flat();
    index[listType] = items;
    parentIds = items.map((item) => item.id);
  }
  return index;
}

// Case/whitespace-insensitive match, same tolerance a human re-typing a
// dropdown's option text into a spreadsheet cell needs. `parentId` is the
// resolved id of the already-validated level above (or null for the
// top-most active level) - a value that exists under a DIFFERENT parent is
// still rejected, since that's not a real path through the tenant's
// configured hierarchy.
export function resolveAcademicListValue(
  index: AcademicHierarchyIndex,
  listType: AcademicListType,
  parentId: string | null,
  value: string,
): AcademicListItem | undefined {
  const needle = value.trim().toLowerCase();
  return (index[listType] ?? []).find((item) => item.parentId === parentId && item.value.trim().toLowerCase() === needle);
}

// The first complete real chain the tenant has configured (first Program,
// its first Department, that Department's first Semester, that Semester's
// first Division) - used to seed the downloadable sample file with values
// that actually exist, rather than fabricated text that would fail its own
// validation the moment it's re-uploaded unmodified. Stops at whichever
// level has nothing configured yet (returns a partial chain, or {} if the
// tenant hasn't set up any of these lists).
export function firstAcademicHierarchyChain(
  index: AcademicHierarchyIndex,
  activeLevels: AcademicListType[],
): Partial<Record<AcademicListType, string>> {
  const chain: Partial<Record<AcademicListType, string>> = {};
  let parentId: string | null = null;
  for (const listType of activeLevels) {
    const first = (index[listType] ?? []).find((item) => item.parentId === parentId);
    if (!first) break;
    chain[listType] = first.value;
    parentId = first.id;
  }
  return chain;
}

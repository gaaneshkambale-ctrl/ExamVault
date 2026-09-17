import { useEffect, useState } from 'react';
import { Col, Form } from 'react-bootstrap';
import { useAcademicListItems } from '../hooks/useAcademicListItems';
import type { AcademicListType } from '../types/academicListItem';
import type { FieldDef } from '../constants/organizationTypeFieldCatalog';

interface HierarchyLevel {
  key: 'program' | 'department' | 'semester' | 'division';
  listType: AcademicListType;
  label: string;
}

const HIER_ORDER: HierarchyLevel[] = [
  { key: 'program', listType: 'Program', label: 'Program' },
  { key: 'department', listType: 'Department', label: 'Department' },
  { key: 'semester', listType: 'Semester', label: 'Semester' },
  { key: 'division', listType: 'Division', label: 'Division / Class' },
];

interface Props {
  // The org type's full field list (eg. getStudentFieldsForType(...) or
  // getExamFieldsForType(...)) - whichever of program/department/semester/
  // division keys appear here render as this cascading picker, in that
  // fixed order; every other field renders exactly as before (free text).
  fields: FieldDef[];
  values: Record<string, string>;
  errors?: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

// Cascading Program -> Department -> Semester -> Division selects, sourced
// from the tenant's own AcademicListItem lists (managed in Organization
// Settings > Academic Configuration) instead of free text. Values are
// still stored as plain strings in academicFields (eg. {"program":"B.Tech
// Computer Engineering"}), same as before this feature existed - not item
// ids - so existing stored values, PDF/report consumers, and validation
// (`!value?.trim()`) all keep working unchanged. On load, each level's
// selected id is best-effort resolved by matching the stored string
// against that level's loaded options; if a tenant renamed/removed the
// matching item since, the picker just starts unselected for that level.
export default function AcademicHierarchyFields({ fields, values, errors, onChange }: Props) {
  const activeLevels = HIER_ORDER.filter((level) => fields.some((f) => f.key === level.key));
  // Index within activeLevels for each hierarchy key, so rendering below can
  // walk `fields` in its own real order (interleaving the cascading
  // pickers with the free-text fields exactly where the catalog places
  // them) instead of always grouping every picker first.
  const levelIndexByKey = new Map<string, number>(activeLevels.map((level, i) => [level.key, i]));

  const [selectedIds, setSelectedIds] = useState<Record<string, string>>({});

  const hasLevel = (key: HierarchyLevel['key']) => activeLevels.some((l) => l.key === key);

  const programsQuery = useAcademicListItems('Program', null, hasLevel('program'));
  const departmentsQuery = useAcademicListItems(
    'Department',
    selectedIds.program ?? null,
    hasLevel('department') && !!selectedIds.program,
  );
  const semestersQuery = useAcademicListItems(
    'Semester',
    selectedIds.department ?? null,
    hasLevel('semester') && !!selectedIds.department,
  );
  const divisionsQuery = useAcademicListItems(
    'Division',
    selectedIds.semester ?? null,
    hasLevel('division') && !!selectedIds.semester,
  );

  const queryByLevel = {
    program: programsQuery,
    department: departmentsQuery,
    semester: semestersQuery,
    division: divisionsQuery,
  } as const;

  useEffect(() => {
    setSelectedIds((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const level of activeLevels) {
        if (next[level.key]) continue;
        const storedValue = values[level.key];
        if (!storedValue) continue;
        const match = queryByLevel[level.key].data?.find((o) => o.value === storedValue);
        if (match) {
          next[level.key] = match.id;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programsQuery.data, departmentsQuery.data, semestersQuery.data, divisionsQuery.data]);

  const handleSelect = (levelIndex: number, id: string, value: string) => {
    const level = activeLevels[levelIndex];
    setSelectedIds((prev) => {
      const next = { ...prev, [level.key]: id };
      for (let i = levelIndex + 1; i < activeLevels.length; i++) {
        delete next[activeLevels[i].key];
      }
      return next;
    });
    onChange(level.key, value);
    for (let i = levelIndex + 1; i < activeLevels.length; i++) {
      onChange(activeLevels[i].key, '');
    }
  };

  return (
    <>
      {fields.map((field) => {
        const index = levelIndexByKey.get(field.key);
        if (index !== undefined) {
          const level = activeLevels[index];
          const query = queryByLevel[level.key];
          const parentLevel = index > 0 ? activeLevels[index - 1] : null;
          const disabled = !!parentLevel && !selectedIds[parentLevel.key];
          return (
            <Col xs={12} md={6} key={level.key} className="mb-3">
              <Form.Label className="small">
                {level.label} <span className="text-danger">*</span>
              </Form.Label>
              <Form.Select
                value={selectedIds[level.key] ?? ''}
                disabled={disabled}
                isInvalid={!!errors?.[level.key]}
                onChange={(e) => {
                  const id = e.target.value;
                  const item = query.data?.find((o) => o.id === id);
                  handleSelect(index, id, item?.value ?? '');
                }}
              >
                <option value="">{disabled ? `Select ${parentLevel!.label} first` : `Select ${level.label}`}</option>
                {query.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.value}
                  </option>
                ))}
              </Form.Select>
              {!disabled && query.isSuccess && query.data.length === 0 && (
                <Form.Text className="text-muted">
                  No {level.label} values yet - add them in Organization Settings &gt; Academic Configuration.
                </Form.Text>
              )}
              <Form.Control.Feedback type="invalid">{errors?.[level.key]}</Form.Control.Feedback>
            </Col>
          );
        }
        return (
          <Col xs={12} md={6} key={field.key} className="mb-3">
            <Form.Label className="small">
              {field.label} {!field.optional && <span className="text-danger">*</span>}
            </Form.Label>
            <Form.Control
              value={values[field.key] ?? ''}
              placeholder={field.placeholder}
              onChange={(e) => onChange(field.key, e.target.value)}
              isInvalid={!!errors?.[field.key]}
            />
            <Form.Control.Feedback type="invalid">{errors?.[field.key]}</Form.Control.Feedback>
          </Col>
        );
      })}
    </>
  );
}

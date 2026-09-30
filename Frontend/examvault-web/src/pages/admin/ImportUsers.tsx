import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Alert, Badge, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import readXlsxFile from 'read-excel-file/browser';
import writeXlsxFile from 'write-excel-file/browser';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import { createUser } from '../../api/userApi';
import { getOrganizationBranding } from '../../api/organizationSettingsApi';
import type { CreateUserRequest, UserRole } from '../../types/user';
import { extractServerError } from '../../utils/apiError';
import { validateImportRow } from '../../utils/importUsersValidation';
import type { ImportUserRow } from '../../utils/importUsersValidation';
import {
  fetchAcademicHierarchyIndex,
  firstAcademicHierarchyChain,
  getActiveHierarchyLevels,
  HIER_TYPE_BY_KEY,
} from '../../utils/academicHierarchyIndex';
import type { AcademicHierarchyIndex } from '../../utils/academicHierarchyIndex';
import { getStudentFieldsForType, getRollNumberLabelForType } from '../../constants/organizationTypeFieldCatalog';
import type { FieldDef } from '../../constants/organizationTypeFieldCatalog';

interface ImportRow extends ImportUserRow {
  id: string;
  rowNumber: number;
  status: 'Valid' | string;
}

// Realistic-looking example values for the sample file's Student row, for
// every free-text (non-hierarchy) key any Organization Type's catalog
// defines (organizationTypeFieldCatalog.ts) - Program/Department/Semester/
// Division get their example values from the tenant's own real configured
// lists instead (see firstAcademicHierarchyChain), since a fabricated value
// there would fail the sample file's own validation the moment it's
// re-uploaded unmodified.
const SAMPLE_VALUE_BY_FIELD_KEY: Record<string, string> = {
  enrollmentNo: 'ENR-2026-001',
  prn: 'PRN20260001',
  year: '2nd Year',
  academicYear: '2026-27',
  admissionNo: 'ADM-2026-001',
  class: '10th',
  batch: '2026-B',
  course: 'Data Structures',
  enrollmentDate: '01-Jul-2026',
  designation: 'Software Engineer',
  manager: 'Ganesh Kamble',
  certificateNo: 'CERT-2026-001',
  applicationId: 'APP-2026-001',
  position: 'Frontend Developer',
};

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function ListCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

const USER_ERROR_OVERRIDES = { 409: 'A user with this email already exists.' };

const STEPS = ['Upload File', 'Preview & Validate', 'Import'] as const;

function buildTemplateHeaders(studentFields: FieldDef[], rollNumberLabel: string): string[] {
  return [
    'Full Name',
    'Email',
    'Role',
    'Phone Number *',
    `${rollNumberLabel} (Students only)`,
    ...studentFields.map((field) => `${field.label} (Students only${field.optional ? ', optional' : ''})`),
  ];
}

async function downloadTemplate(studentFields: FieldDef[], rollNumberLabel: string, hierarchyIndex: AcademicHierarchyIndex) {
  const headers = buildTemplateHeaders(studentFields, rollNumberLabel);
  const activeLevels = getActiveHierarchyLevels(studentFields);
  const chain = firstAcademicHierarchyChain(hierarchyIndex, activeLevels);

  const studentAcademicCells = studentFields.map((field) => {
    const hierType = HIER_TYPE_BY_KEY[field.key];
    const value = hierType ? (chain[hierType] ?? '') : (SAMPLE_VALUE_BY_FIELD_KEY[field.key] ?? '');
    return { value };
  });

  const data = [
    headers.map((header) => ({ value: header, fontWeight: 'bold' as const })),
    [
      { value: 'Jane Doe' },
      { value: 'jane.doe@example.com' },
      { value: 'Student' },
      { value: '9876543210' },
      { value: 'R-1001' },
      ...studentAcademicCells,
    ],
    [
      { value: 'Priya Sharma' },
      { value: 'priya.sharma@example.com' },
      { value: 'Admin' },
      { value: '9876543211' },
      { value: '' },
      ...studentFields.map(() => ({ value: '' })),
    ],
  ];
  await writeXlsxFile(data, {
    columns: [{ width: 24 }, { width: 28 }, { width: 14 }, { width: 18 }, { width: 24 }, ...studentFields.map(() => ({ width: 22 }))],
  }).toFile('user-import-template.xlsx');
}

export default function ImportUsers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: branding, isLoading: isBrandingLoading, isError: isBrandingError } = useQuery({
    queryKey: ['organization-branding'],
    queryFn: getOrganizationBranding,
  });
  const studentFields = getStudentFieldsForType(branding?.organizationType);
  const rollNumberLabel = getRollNumberLabelForType(branding?.organizationType);
  const activeHierarchyLevels = getActiveHierarchyLevels(studentFields);

  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdCount, setCreatedCount] = useState(0);

  const validRows = rows.filter((r) => r.status === 'Valid');
  const currentStepIndex = createdCount > 0 ? 2 : rows.length > 0 ? 1 : 0;
  const uploadDisabled = isParsing || isBrandingLoading || isBrandingError;

  const handleFileSelected = async (file: File) => {
    setIsParsing(true);
    setParseError('');
    setCreateError('');
    setCreatedCount(0);
    try {
      const sheets = await readXlsxFile(file);
      const dataRows = sheets[0].data.slice(1);
      if (dataRows.length === 0) {
        setRows([]);
        setParseError('The file has no data rows below the header.');
        return;
      }
      const parsed: ImportRow[] = dataRows.map((cells, index) => ({
        id: `row-${index}`,
        rowNumber: index + 2,
        fullName: cells[0] ? String(cells[0]).trim() : '',
        email: cells[1] ? String(cells[1]).trim() : '',
        role: cells[2] ? String(cells[2]).trim() : '',
        phoneNumber: cells[3] ? String(cells[3]).trim() : '',
        rollNumber: cells[4] ? String(cells[4]).trim() : '',
        academicFields: Object.fromEntries(
          studentFields.map((field, fieldIndex) => [field.key, cells[5 + fieldIndex] ? String(cells[5 + fieldIndex]).trim() : '']),
        ),
        status: 'Valid',
      }));
      // Fetched fresh per upload (not cached) so a tenant's latest Academic
      // Configuration always governs validation, even if it changed since
      // the last file was checked in this same session.
      const hierarchyIndex =
        activeHierarchyLevels.length > 0 ? await fetchAcademicHierarchyIndex(activeHierarchyLevels) : {};
      const validated = parsed.map((row) => ({
        ...row,
        status: validateImportRow(row, parsed, studentFields, hierarchyIndex),
      }));
      setRows(validated);
    } catch {
      setParseError('Could not read this file. Please use the downloadable template and try again.');
      setRows([]);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileSelected(file);
    }
  };

  const handleDownloadTemplate = async () => {
    const hierarchyIndex =
      activeHierarchyLevels.length > 0 ? await fetchAcademicHierarchyIndex(activeHierarchyLevels) : {};
    await downloadTemplate(studentFields, rollNumberLabel, hierarchyIndex);
  };

  const handleCreate = async () => {
    if (validRows.length === 0) return;
    setIsCreating(true);
    setCreateError('');

    const results = await Promise.allSettled(
      validRows.map((row) => {
        const request: CreateUserRequest = {
          fullName: row.fullName,
          email: row.email,
          role: row.role as UserRole,
          phoneNumber: row.phoneNumber,
          rollNumber: row.rollNumber || null,
          academicFields: row.role === 'Student' ? row.academicFields : null,
        };
        return createUser(request);
      }),
    );

    const failedIds = new Set<string>();
    const failedReasons = new Map<string, string>();
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const row = validRows[index];
        failedIds.add(row.id);
        failedReasons.set(row.id, extractServerError(result.reason, USER_ERROR_OVERRIDES));
      }
    });

    const succeededCount = validRows.length - failedIds.size;
    setCreatedCount(succeededCount);

    if (failedIds.size > 0) {
      setCreateError(`${failedIds.size} row(s) failed to create and are still listed below - fix and try again.`);
      setRows((prev) =>
        prev
          .filter((r) => r.status !== 'Valid' || failedIds.has(r.id))
          .map((r) => (failedIds.has(r.id) ? { ...r, status: failedReasons.get(r.id) ?? 'Failed to create.' } : r)),
      );
      setIsCreating(false);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['users'] });
    setIsCreating(false);
    navigate('/admin/users');
  };

  return (
    <AdminLayout active="Users">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 44, height: 44, background: '#eef2ff', color: '#4f46e5' }}
          >
            <UploadIcon />
          </div>
          <div>
            <p className="text-muted small mb-1">Users / Bulk Import Users</p>
            <h1 className="h4 fw-bold mb-1 text-primary">Bulk Import Users</h1>
            <p className="text-muted mb-0">Import multiple users at once using an Excel (.xlsx) file.</p>
          </div>
        </div>
        <Button variant="outline-primary" disabled={isBrandingLoading || isBrandingError} onClick={() => void handleDownloadTemplate()}>
          Download Sample File
        </Button>
      </div>

      <div className="d-flex gap-2 my-3 flex-wrap">
        {STEPS.map((step, index) => (
          <Badge
            key={step}
            bg={index === currentStepIndex ? 'primary' : index < currentStepIndex ? 'success' : 'light'}
            text={index <= currentStepIndex ? undefined : 'dark'}
            className="fw-normal py-2 px-3"
          >
            {index + 1}. {step}
          </Badge>
        ))}
      </div>

      <Row className="g-3">
        <Col xs={12} md={7}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <SectionHeader icon={<UploadIcon />} title="Upload File" subtitle="Upload an Excel file with user details." />

              <div
                className={`border border-2 border-dashed rounded-3 text-center py-5 px-3 ${isDragOver ? 'bg-primary-subtle' : 'bg-body-tertiary'}`}
                style={{
                  borderColor: isDragOver ? '#4f46e5' : '#dee2e6',
                  cursor: uploadDisabled ? 'default' : 'pointer',
                  opacity: uploadDisabled ? 0.7 : 1,
                }}
                onClick={() => !uploadDisabled && fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!uploadDisabled) setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => !uploadDisabled && handleDrop(e)}
              >
                <div className="text-muted mb-2">Drag and drop your file here</div>
                <div className="text-muted small mb-3">or</div>
                <Button variant="primary" size="sm" disabled={uploadDisabled} onClick={(e) => e.stopPropagation()}>
                  Browse File
                </Button>
                <div className="text-muted small mt-3">Supported format: .xlsx only</div>
                <div className="text-muted small">Maximum file size: 5MB</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="d-none"
                disabled={uploadDisabled}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleFileSelected(file);
                  }
                }}
              />

              {isBrandingLoading && (
                <div className="mt-3 d-flex align-items-center gap-2 text-muted">
                  <Spinner animation="border" size="sm" />
                  Loading organization settings...
                </div>
              )}
              {isBrandingError && (
                <Alert variant="danger" className="mt-3 mb-0">
                  Couldn't load organization settings, so the correct Academic Details columns can't be determined
                  yet. Please refresh and try again.
                </Alert>
              )}
              {isParsing && (
                <div className="mt-3 d-flex align-items-center gap-2 text-muted">
                  <Spinner animation="border" size="sm" />
                  Reading file...
                </div>
              )}
              {parseError && (
                <Alert variant="danger" className="mt-3 mb-0">
                  {parseError}
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={5}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <SectionHeader icon={<InfoIcon />} title="File Guidelines" />
              <ul className="small text-muted ps-3 mb-0">
                <li className="mb-2">Download the sample file and follow the format.</li>
                <li className="mb-2">
                  Required columns: Full Name, Email, Role (<code>Student</code> or <code>Admin</code>), Phone
                  Number.
                </li>
                <li className="mb-2">{rollNumberLabel} is required for Student rows - leave it blank for Admin.</li>
                {studentFields.length > 0 && (
                  <li className="mb-2">
                    Student rows also need every Academic Details column this organization requires (see the sample
                    file) - Admin rows can leave them blank.
                    {activeHierarchyLevels.length > 0 &&
                      ' Program/Department/Semester/Division must exactly match values already configured in Organization Settings > Academic Configuration.'}
                  </li>
                )}
                <li className="mb-2">Email must be unique, both within the file and across existing users.</li>
                <li>Password isn't collected here - it's auto-generated and emailed on creation.</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {rows.length > 0 && (
        <Card className="border-0 shadow-sm mt-3">
          <Card.Body className="p-4">
            <SectionHeader
              icon={<ListCheckIcon />}
              title={`Preview & Validate (${validRows.length} of ${rows.length} rows ready to import)`}
              action={
              <div className="d-flex gap-2">
                <Link to="/admin/users" className="btn btn-outline-secondary">
                  Cancel
                </Link>
                <Button variant="primary" disabled={validRows.length === 0 || isCreating} onClick={() => void handleCreate()}>
                  {isCreating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creating...
                    </>
                  ) : (
                    `Import ${validRows.length} User${validRows.length === 1 ? '' : 's'}`
                  )}
                </Button>
              </div>
              }
            />

            {createError && <Alert variant="danger">{createError}</Alert>}
            {createdCount > 0 && (
              <Alert variant="success">{createdCount} user(s) created successfully.</Alert>
            )}

            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th>Row</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone Number</th>
                  <th>{rollNumberLabel}</th>
                  {studentFields.length > 0 && <th>Academic Details</th>}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.rowNumber}</td>
                    <td>{row.fullName}</td>
                    <td>{row.email}</td>
                    <td>{row.role}</td>
                    <td>{row.phoneNumber || '-'}</td>
                    <td>{row.rollNumber || '-'}</td>
                    {studentFields.length > 0 && (
                      <td className="text-muted small">
                        {row.role === 'Student' && Object.values(row.academicFields).some(Boolean)
                          ? Object.values(row.academicFields).filter(Boolean).join(', ')
                          : '-'}
                      </td>
                    )}
                    <td>
                      <Badge bg={row.status === 'Valid' ? 'success' : 'danger'}>{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </AdminLayout>
  );
}

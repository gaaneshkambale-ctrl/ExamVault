import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Alert, Badge, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import readXlsxFile from 'read-excel-file/browser';
import writeXlsxFile from 'write-excel-file/browser';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import { createUser } from '../../api/userApi';
import type { CreateUserRequest, UserRole } from '../../types/user';
import { extractServerError } from '../../utils/apiError';

interface ImportRow {
  id: string;
  rowNumber: number;
  fullName: string;
  email: string;
  role: string;
  phoneNumber: string;
  status: 'Valid' | string;
}

const TEMPLATE_HEADERS = ['Full Name', 'Email', 'Role', 'Phone Number'];

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

function validateRow(row: ImportRow, allRows: ImportRow[]): string {
  if (!row.fullName.trim()) {
    return 'Full Name is required.';
  }
  if (!row.email.trim()) {
    return 'Email is required.';
  }
  if (row.role !== 'Student' && row.role !== 'Admin') {
    return 'Role must be exactly "Student" or "Admin".';
  }
  const emailLower = row.email.trim().toLowerCase();
  const duplicateInFile = allRows.filter((r) => r.email.trim().toLowerCase() === emailLower);
  if (duplicateInFile.length > 1) {
    return 'Duplicate email within the file.';
  }
  return 'Valid';
}

async function downloadTemplate() {
  const data = [
    TEMPLATE_HEADERS.map((header) => ({ value: header, fontWeight: 'bold' as const })),
    [
      { value: 'Jane Doe' },
      { value: 'jane.doe@example.com' },
      { value: 'Student' },
      { value: '9876543210' },
    ],
  ];
  await writeXlsxFile(data, {
    columns: [{ width: 24 }, { width: 28 }, { width: 14 }, { width: 18 }],
  }).toFile('user-import-template.xlsx');
}

export default function ImportUsers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdCount, setCreatedCount] = useState(0);

  const validRows = rows.filter((r) => r.status === 'Valid');
  const currentStepIndex = createdCount > 0 ? 2 : rows.length > 0 ? 1 : 0;

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
        status: 'Valid',
      }));
      const validated = parsed.map((row) => ({ ...row, status: validateRow(row, parsed) }));
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
        <Button variant="outline-primary" onClick={() => void downloadTemplate()}>
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
                  cursor: 'pointer',
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
              >
                <div className="text-muted mb-2">Drag and drop your file here</div>
                <div className="text-muted small mb-3">or</div>
                <Button variant="primary" size="sm" onClick={(e) => e.stopPropagation()}>
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
                disabled={isParsing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleFileSelected(file);
                  }
                }}
              />

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
                  Required columns: Full Name, Email, Role (<code>Student</code> or <code>Admin</code>).
                </li>
                <li className="mb-2">Email must be unique, both within the file and across existing users.</li>
                <li className="mb-2">Password isn't collected here - it's auto-generated and emailed on creation.</li>
                <li>Phone Number is optional.</li>
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

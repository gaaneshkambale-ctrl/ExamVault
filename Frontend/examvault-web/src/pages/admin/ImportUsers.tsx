import { useRef, useState } from 'react';
import { Alert, Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import readXlsxFile from 'read-excel-file/browser';
import writeXlsxFile from 'write-excel-file/browser';
import AdminLayout from '../../layouts/AdminLayout';
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

const USER_ERROR_OVERRIDES = { 409: 'A user with this email already exists.' };

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
  const [createError, setCreateError] = useState('');
  const [createdCount, setCreatedCount] = useState(0);

  const validRows = rows.filter((r) => r.status === 'Valid');

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
          isActive: false,
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
      <Link to="/admin/users" className="text-decoration-none small d-inline-block mb-3">
        &larr; Back to Users
      </Link>

      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">Import Users</h1>
        <p className="text-muted mb-0">Bulk-create users from an Excel (.xlsx) file.</p>
      </div>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-4">
          <h2 className="h6 fw-bold mb-3">1. Download the template</h2>
          <p className="text-muted small mb-3">
            Columns: Full Name, Email, Role (Student or Admin), Phone Number (optional).
          </p>
          <Button variant="outline-primary" onClick={() => void downloadTemplate()} className="mb-4">
            Download Template
          </Button>

          <h2 className="h6 fw-bold mb-3">2. Upload your filled-in file</h2>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="form-control"
            style={{ maxWidth: 360 }}
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

      {rows.length > 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h6 fw-bold mb-0">
                3. Review ({validRows.length} of {rows.length} rows ready to import)
              </h2>
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
                    `Create ${validRows.length} User${validRows.length === 1 ? '' : 's'}`
                  )}
                </Button>
              </div>
            </div>

            {createError && <Alert variant="danger">{createError}</Alert>}
            {createdCount > 0 && (
              <Alert variant="success">{createdCount} user(s) created successfully.</Alert>
            )}

            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
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

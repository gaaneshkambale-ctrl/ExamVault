import { useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Badge, Button, Card, Col, Dropdown, Form, InputGroup, Modal, Row, Table } from 'react-bootstrap';
import AdminLayout from '../../layouts/AdminLayout';
import ReportStatCard from '../../components/reports/ReportStatCard';
import { CheckCircleIcon, MinusCircleIcon } from '../../components/reports/ReportIcons';
import { useAuth } from '../../hooks/useAuth';
import { useUsers } from '../../hooks/useUsers';
import { useRolePermissions, useUpdateRolePermissions } from '../../hooks/useRolePermissions';
import { BarChartIcon, EditIcon, UsersIcon } from '../../components/icons/ActionIcons';
import {
  COSMETIC_PERMISSIONS,
  COSMETIC_ROLE_PERMISSIONS,
  ADMIN_PERMISSIONS,
  STUDENT_PERMISSIONS,
  INSTRUCTOR_PERMISSIONS,
} from '../../constants/cosmeticRolePermissions';
import type { UserRole } from '../../types/user';

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function PersonIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

function QuestionCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12" y2="17" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
      <path d="M9 12.5l2 2 4-4.5" />
    </svg>
  );
}

interface PermissionModule {
  name: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  permissions: string[];
}

// Groups the same flat COSMETIC_PERMISSIONS list the rest of the page
// already uses into named modules purely for the edit modal's layout - the
// underlying permission keys and their persistence are unchanged.
const PERMISSION_MODULES: PermissionModule[] = [
  { name: 'Dashboard', icon: <GridIcon />, iconBg: '#eef2ff', iconColor: '#4f46e5', permissions: ['Dashboard - View'] },
  { name: 'Exams', icon: <ClipboardIcon />, iconBg: '#eef2ff', iconColor: '#4f46e5', permissions: ['Exams - Create', 'Exams - Edit'] },
  { name: 'Questions', icon: <QuestionCircleIcon />, iconBg: '#ecfdf5', iconColor: '#059669', permissions: ['Questions - Create', 'Questions - Edit'] },
  { name: 'Results', icon: <BarChartIcon />, iconBg: '#fff7ed', iconColor: '#d97706', permissions: ['Results - View'] },
  { name: 'Users', icon: <UsersIcon />, iconBg: '#ede9fe', iconColor: '#7c3aed', permissions: ['Users - View', 'Users - Edit'] },
  { name: 'Settings', icon: <GearIcon />, iconBg: '#e0f2fe', iconColor: '#0284c7', permissions: ['Settings - View', 'Settings - Edit'] },
  { name: 'Reports', icon: <DocumentIcon />, iconBg: '#ecfdf5', iconColor: '#059669', permissions: ['Reports - View'] },
  { name: 'Certificates', icon: <ShieldCheckIcon />, iconBg: '#eef2ff', iconColor: '#4f46e5', permissions: ['Certificates - View'] },
];

interface RoleRow {
  role: string;
  description: string;
  variant: string;
  isReal: boolean;
  // Shown while the live permission set is still loading, so nothing
  // flashes empty - once useRolePermissions() resolves, the live set
  // (persisted server-side) takes over as the actual source of truth.
  defaultPermissions: string[];
}

// Super Admin is deliberately not listed here - it's platform-level, never
// assignable or editable from a tenant's own screen, so showing a row that
// can never be interacted with was just confusing. It's still mentioned in
// the banner below for context.
const roles: RoleRow[] = [
  {
    role: 'Admin',
    description: 'Manage exams, questions, AI generation, and users.',
    variant: 'primary',
    isReal: true,
    defaultPermissions: ADMIN_PERMISSIONS,
  },
  {
    role: 'Instructor',
    description: 'Create exams, manage questions and view results.',
    variant: 'warning',
    isReal: true,
    defaultPermissions: INSTRUCTOR_PERMISSIONS,
  },
  {
    role: 'Student',
    description: 'Take exams and view their own results.',
    variant: 'secondary',
    isReal: true,
    defaultPermissions: STUDENT_PERMISSIONS,
  },
  {
    role: 'Viewer',
    description: 'View-only access to reports and results.',
    variant: 'info',
    isReal: false,
    defaultPermissions: COSMETIC_ROLE_PERMISSIONS.Viewer,
  },
];

type StatusFilter = 'all' | 'active' | 'unavailable';

function formatUpdatedAt(iso: string | null | undefined): { date: string; time: string } | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    date: parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
    time: parsed.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function RolesPermissions() {
  const { user: currentUser } = useAuth();
  const { data: users } = useUsers();
  const { data: liveRolePermissions } = useRolePermissions();
  const updateRolePermissions = useUpdateRolePermissions();

  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const countFor = (role: string) => users?.filter((u) => u.role === (role as UserRole)).length ?? 0;

  const permissionsFor = (role: string, fallback: string[]) =>
    liveRolePermissions?.find((r) => r.role === role)?.permissions ?? fallback;

  const updatedAtFor = (role: string) => liveRolePermissions?.find((r) => r.role === role)?.updatedAtUtc ?? null;

  const assignedPermissions = new Set(roles.flatMap((r) => permissionsFor(r.role, r.defaultPermissions)));
  const unassignedCount = COSMETIC_PERMISSIONS.length - assignedPermissions.size;

  const visibleRoles = roles.filter((r) => {
    const matchesSearch =
      search.trim() === '' ||
      r.role.toLowerCase().includes(search.trim().toLowerCase()) ||
      r.description.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || (statusFilter === 'active' ? r.isReal : !r.isReal);
    return matchesSearch && matchesStatus;
  });

  const openEdit = (role: string, fallback: string[]) => {
    setDraftPermissions(new Set(permissionsFor(role, fallback)));
    setEditingRole(role);
  };

  const togglePermission = (perm: string) => {
    setDraftPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) {
        next.delete(perm);
      } else {
        next.add(perm);
      }
      return next;
    });
  };

  const saveEdit = () => {
    if (!editingRole) return;
    updateRolePermissions.mutate(
      { role: editingRole, permissions: [...draftPermissions] },
      { onSuccess: () => setEditingRole(null) },
    );
  };

  return (
    <AdminLayout active="Roles & Permissions">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <div>
          <p className="text-muted small mb-1">Users / Roles &amp; Permissions</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Roles &amp; Permissions</h1>
          <p className="text-muted mb-0">Manage user roles and their permissions.</p>
        </div>
        <Button variant="primary" disabled title="Custom roles aren't supported yet">
          + Add Role
        </Button>
      </div>

      <Alert variant="secondary" className="small mt-3">
        ExamVault currently supports four authorization roles - <strong>Admin</strong>, <strong>Student</strong>,{' '}
        <strong>Instructor</strong>, and <strong>Super Admin</strong> - enforced by the app's route protections.
        Super Admin is used for platform and tenant management and isn't assignable from this screen. The
        permission checklist below can be edited and is saved per role. Some permissions are now genuinely
        enforced server-side - unchecking one, saving, and logging the affected role back in will actually
        block that action. Others remain informational only until their own backend enforcement is wired up.
      </Alert>

      <Row className="g-3 mt-1">
        <Col xs={6} md={3}>
          <ReportStatCard
            icon={<PersonIcon />}
            label="Total Roles"
            value={String(roles.length)}
            caption="Active roles in system"
            iconBg="#eef2ff"
            iconColor="#4f46e5"
          />
        </Col>
        <Col xs={6} md={3}>
          <ReportStatCard
            icon={<LockIcon />}
            label="Total Permissions"
            value={String(COSMETIC_PERMISSIONS.length)}
            caption="Available permissions"
            iconBg="#ecfdf5"
            iconColor="#059669"
          />
        </Col>
        <Col xs={6} md={3}>
          <ReportStatCard
            icon={<CheckCircleIcon />}
            label="Assigned Permissions"
            value={String(assignedPermissions.size)}
            caption="Permissions assigned"
            iconBg="#ede9fe"
            iconColor="#7c3aed"
          />
        </Col>
        <Col xs={6} md={3}>
          <ReportStatCard
            icon={<MinusCircleIcon />}
            label="Unassigned Permissions"
            value={String(unassignedCount)}
            caption="Permissions pending"
            iconBg="#fff7ed"
            iconColor="#d97706"
          />
        </Col>
      </Row>

      <Card className="border-0 shadow-sm mt-3">
        <Card.Body>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <div className="fw-bold">Roles</div>
              <div className="text-muted small">View and manage all user roles in the system.</div>
            </div>
            <div className="d-flex gap-2">
              <InputGroup style={{ width: 220 }}>
                <InputGroup.Text>
                  <SearchIcon />
                </InputGroup.Text>
                <Form.Control
                  type="search"
                  placeholder="Search roles..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>
              <Dropdown>
                <Dropdown.Toggle
                  as="button"
                  bsPrefix="btn"
                  className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
                >
                  <FilterIcon /> Filter
                </Dropdown.Toggle>
                <Dropdown.Menu align="end">
                  <Dropdown.Item active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                    All Statuses
                  </Dropdown.Item>
                  <Dropdown.Item active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>
                    Active
                  </Dropdown.Item>
                  <Dropdown.Item active={statusFilter === 'unavailable'} onClick={() => setStatusFilter('unavailable')}>
                    Not Available
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>

          <Table responsive hover className="mb-0 align-middle">
            <thead className="text-muted small text-uppercase bg-body-tertiary">
              <tr>
                <th className="ps-2">Role Name</th>
                <th>Description</th>
                <th>Users</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th className="pe-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRoles.map(({ role, description, variant, isReal, defaultPermissions }) => {
                const isOwnRole = role === currentUser?.role;
                const canEdit = isReal && !isOwnRole;
                const updatedAt = formatUpdatedAt(updatedAtFor(role));
                return (
                  <tr key={role}>
                    <td className="ps-2">
                      <Badge bg={variant}>{role}</Badge>
                    </td>
                    <td>{description}</td>
                    <td className="fw-medium">{isReal ? countFor(role) : 0}</td>
                    <td>
                      <Badge bg={isReal ? 'success' : 'secondary'}>{isReal ? 'Active' : 'Not Available'}</Badge>
                    </td>
                    <td className="small">
                      {updatedAt ? (
                        <>
                          <div>{updatedAt.date}</div>
                          <div className="text-muted">{updatedAt.time}</div>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="pe-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                        style={{ width: 32, height: 32 }}
                        title={
                          canEdit
                            ? `Edit ${role} permissions`
                            : isOwnRole
                              ? "You can't edit the permissions of your own role"
                              : `${role} permissions aren't editable from this screen`
                        }
                        disabled={!canEdit}
                        onClick={() => openEdit(role, defaultPermissions)}
                      >
                        <EditIcon />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {visibleRoles.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    No roles match your search/filter.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={editingRole !== null} onHide={() => setEditingRole(null)} centered size="lg">
        <Modal.Header closeButton>
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
              style={{ width: 40, height: 40, background: '#eef2ff', color: '#4f46e5' }}
            >
              <ShieldCheckIcon />
            </div>
            <div>
              <Modal.Title className="h6 mb-0">Edit {editingRole} Permissions</Modal.Title>
              <div className="text-muted small">Manage the permissions available for the {editingRole} role.</div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="py-2 small">
            Saving updates {editingRole}'s permission set. Some of these permissions are already enforced
            server-side; others remain informational until their own backend enforcement is wired up.
          </Alert>

          <div className="fw-bold mb-2">Permission Modules</div>
          <Row className="g-4">
            {PERMISSION_MODULES.map((mod) => (
              <Col xs={12} md={4} key={mod.name}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                    style={{ width: 28, height: 28, background: mod.iconBg, color: mod.iconColor }}
                  >
                    {mod.icon}
                  </div>
                  <span className="fw-medium small">{mod.name}</span>
                </div>
                {mod.permissions.map((perm) => (
                  <Form.Check
                    key={perm}
                    type="checkbox"
                    id={`edit-perm-${perm}`}
                    label={perm}
                    className="mb-1"
                    checked={draftPermissions.has(perm)}
                    onChange={() => togglePermission(perm)}
                  />
                ))}
              </Col>
            ))}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setEditingRole(null)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={updateRolePermissions.isPending} onClick={saveEdit}>
            {updateRolePermissions.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
}

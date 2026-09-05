import { useMemo, useState } from 'react';
import { Badge, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import OrgAvatar from '../../components/OrgAvatar';
import SegmentDonutChart from '../../components/SegmentDonutChart';
import { useTenants } from '../../hooks/useTenants';
import { listAllUsers } from '../../api/userApi';
import { timeAgo } from '../../utils/timeAgo';
import type { PlatformUserListItem } from '../../types/user';

// Matches Alluser.png. Everything here is real, unlike most of the rest of
// this console - fixing UserRepository's missing tenant scoping (see
// ExamVault Super Admin Menu.txt) both closed a real cross-tenant leak and
// gave GET /api/users a genuine "see everyone" mode for a Super Admin
// caller, so this page needed no placeholder sections at all. Only two
// things from the mockup are dropped: Users by Status' "Suspended"/
// "Pending" (no such user state exists - just IsActive), and Last Login's
// exact mockup format (real data, timeAgo instead of a fixed date/time
// string - matches how the rest of this console already renders it).
const ROLE_TABS = [
  { key: 'all', label: 'All Users' },
  { key: 'Admin', label: 'Organization Admins' },
  { key: 'Instructor', label: 'Instructors' },
  { key: 'Student', label: 'Students' },
  { key: 'SuperAdmin', label: 'Platform Admins' },
] as const;

interface AllUsersProps {
  // Undefined = "All Users". Lets the sidebar's Organization Admins/
  // Students/Platform Admins links deep-link straight to that tab,
  // matching how ManageTenants' statusFilter prop works for Organizations.
  roleFilter?: 'Admin' | 'Instructor' | 'Student' | 'SuperAdmin';
}

const ROLE_NAV_KEYS: Record<(typeof ROLE_TABS)[number]['key'], string> = {
  all: 'users-all',
  Admin: 'users-org-admins',
  Instructor: 'users-instructors',
  Student: 'users-students',
  SuperAdmin: 'users-platform-admins',
};

// Header/breadcrumb copy per entry point - the sidebar's Organization
// Admins/Students/Platform Admins links deep-link into this same page via
// roleFilter, so each needs to look like its own page rather than always
// reading "All Users" regardless of which link was clicked.
const PAGE_COPY: Record<
  (typeof ROLE_TABS)[number]['key'],
  { title: string; description: string }
> = {
  all: { title: 'All Users', description: 'Every user across every organization on the platform.' },
  Admin: { title: 'Organization Admins', description: 'Every organization admin across every organization on the platform.' },
  Instructor: { title: 'Instructors', description: 'Every instructor across every organization on the platform.' },
  Student: { title: 'Students', description: 'Every student across every organization on the platform.' },
  SuperAdmin: { title: 'Platform Admins', description: 'Every platform admin on the platform.' },
};

function exportUsersToCsv(users: PlatformUserListItem[], tenantNameById: Map<string, string>) {
  const header = ['Full Name', 'Email', 'Organization', 'Role', 'Status', 'Joined On'];
  const rows = users.map((u) => [
    u.fullName,
    u.email,
    tenantNameById.get(u.tenantId) ?? '',
    u.role,
    u.isActive ? 'Active' : 'Inactive',
    new Date(u.createdAtUtc).toISOString(),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `platform-users-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AllUsers({ roleFilter }: AllUsersProps) {
  const { data: users, isLoading, isError } = useQuery({ queryKey: ['platform-users'], queryFn: listAllUsers });
  const { data: tenants } = useTenants();

  const [searchText, setSearchText] = useState('');
  const [roleTab, setRoleTab] = useState<(typeof ROLE_TABS)[number]['key']>(roleFilter ?? 'all');
  const [organizationFilter, setOrganizationFilter] = useState('all');

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  // Organization filter scopes everything below it (counts, charts, Recent
  // Registrations, the table) - role tab and search filter further from
  // there, so all three combine rather than override each other.
  const orgScopedUsers = useMemo(
    () => (organizationFilter === 'all' ? (users ?? []) : (users ?? []).filter((u) => u.tenantId === organizationFilter)),
    [users, organizationFilter],
  );

  const counts = useMemo(() => {
    const list = orgScopedUsers;
    return {
      all: list.length,
      Admin: list.filter((u) => u.role === 'Admin').length,
      Instructor: list.filter((u) => u.role === 'Instructor').length,
      Student: list.filter((u) => u.role === 'Student').length,
      SuperAdmin: list.filter((u) => u.role === 'SuperAdmin').length,
      active: list.filter((u) => u.isActive).length,
      inactive: list.filter((u) => !u.isActive).length,
    };
  }, [orgScopedUsers]);

  const searchQuery = searchText.trim().toLowerCase();
  const filteredUsers = orgScopedUsers.filter((user) => {
    if (roleTab !== 'all' && user.role !== roleTab) return false;
    if (!searchQuery) return true;
    const orgName = tenantNameById.get(user.tenantId) ?? '';
    return (
      user.fullName.toLowerCase().includes(searchQuery) ||
      user.email.toLowerCase().includes(searchQuery) ||
      (user.phoneNumber ?? '').toLowerCase().includes(searchQuery) ||
      orgName.toLowerCase().includes(searchQuery)
    );
  });

  const recentRegistrations: PlatformUserListItem[] = [...orgScopedUsers]
    .sort((a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime())
    .slice(0, 5);

  const pageCopy = PAGE_COPY[roleTab];

  return (
    <PlatformLayout active={ROLE_NAV_KEYS[roleTab]}>
      <p className="text-muted small mb-1">Platform Admin / Users / {pageCopy.title}</p>
      <h1 className="h4 fw-bold mb-1 text-primary">{pageCopy.title}</h1>
      <p className="text-muted mb-3">{pageCopy.description}</p>

      <Form.Group className="mb-3" controlId="allUsersOrgFilter" style={{ maxWidth: 320 }}>
        <Form.Label className="small fw-bold">Organization</Form.Label>
        <Form.Select value={organizationFilter} onChange={(e) => setOrganizationFilter(e.target.value)}>
          <option value="all">All Organizations</option>
          {(tenants ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div className="d-flex gap-2 flex-wrap">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setRoleTab(tab.key)}
              className={`btn btn-sm ${roleTab === tab.key ? 'btn-primary' : 'btn-outline-secondary'}`}
            >
              {tab.label} ({counts[tab.key]})
            </button>
          ))}
        </div>
        <div className="d-flex gap-2">
          <Form.Control
            type="search"
            placeholder="Search by name, email, phone or organization..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 280 }}
          />
          <Button
            variant="outline-primary"
            disabled={filteredUsers.length === 0}
            onClick={() => exportUsersToCsv(filteredUsers, tenantNameById)}
          >
            Export
          </Button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          <Card className="border-0 shadow-sm">
            <Card.Body className={isLoading || isError || filteredUsers.length === 0 ? '' : 'p-0'}>
              {isLoading && (
                <div className="d-flex justify-content-center py-5">
                  <Spinner animation="border" />
                </div>
              )}

              {isError && <div className="text-center text-danger py-5">Couldn't load users. Please try again.</div>}

              {!isLoading && !isError && filteredUsers.length === 0 && (
                <div className="text-center text-muted py-5">No users match your search.</div>
              )}

              {!isLoading && !isError && filteredUsers.length > 0 && (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th className="ps-4">User</th>
                      <th>Organization</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Joined On</th>
                      <th className="pe-4">Created By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="ps-4">
                          <div className="fw-medium">{user.fullName}</div>
                          <div className="text-muted" style={{ fontSize: 12 }}>
                            {user.email}
                          </div>
                        </td>
                        <td className="text-muted">{tenantNameById.get(user.tenantId) ?? '—'}</td>
                        <td>
                          <Badge
                            bg={
                              user.role === 'SuperAdmin'
                                ? 'primary'
                                : user.role === 'Admin'
                                  ? 'info'
                                  : user.role === 'Instructor'
                                    ? 'warning'
                                    : 'secondary'
                            }
                          >
                            {user.role === 'Admin'
                              ? 'Organization Admin'
                              : user.role === 'SuperAdmin'
                                ? 'Platform Admin'
                                : user.role === 'Instructor'
                                  ? 'Instructor'
                                  : 'Student'}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={user.isActive ? 'success' : 'secondary'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
                        </td>
                        <td className="text-muted">{user.lastLoginAtUtc ? timeAgo(user.lastLoginAtUtc) : 'Never'}</td>
                        <td>{new Date(user.createdAtUtc).toLocaleDateString()}</td>
                        <td className="pe-4 text-muted">{user.createdByName ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </div>

        <div className="col-lg-4">
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Users Overview</h2>
              <div className="row g-2 text-center">
                <div className="col-6">
                  <div className="h5 fw-bold mb-0">{counts.all}</div>
                  <div className="text-muted small">Total Users</div>
                </div>
                <div className="col-6">
                  <div className="h5 fw-bold mb-0">{counts.Admin}</div>
                  <div className="text-muted small">Organization Admins</div>
                </div>
                <div className="col-6">
                  <div className="h5 fw-bold mb-0">{counts.Instructor}</div>
                  <div className="text-muted small">Instructors</div>
                </div>
                <div className="col-6">
                  <div className="h5 fw-bold mb-0">{counts.Student}</div>
                  <div className="text-muted small">Students</div>
                </div>
                <div className="col-6">
                  <div className="h5 fw-bold mb-0">{counts.SuperAdmin}</div>
                  <div className="text-muted small">Platform Admins</div>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Users by Role</h2>
              <SegmentDonutChart
                centerLabel="Total"
                segments={[
                  { label: 'Students', value: counts.Student, color: '#2563eb' },
                  { label: 'Organization Admins', value: counts.Admin, color: '#16a34a' },
                  { label: 'Instructors', value: counts.Instructor, color: '#d97706' },
                  { label: 'Platform Admins', value: counts.SuperAdmin, color: '#7c3aed' },
                ]}
              />
              <div className="d-flex flex-column gap-1 mt-2 small">
                <div className="d-flex justify-content-between">
                  <span>
                    <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: '#2563eb' }} />
                    Students
                  </span>
                  <span>{counts.Student}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>
                    <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: '#16a34a' }} />
                    Organization Admins
                  </span>
                  <span>{counts.Admin}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>
                    <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: '#d97706' }} />
                    Instructors
                  </span>
                  <span>{counts.Instructor}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>
                    <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: '#7c3aed' }} />
                    Platform Admins
                  </span>
                  <span>{counts.SuperAdmin}</span>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Users by Status</h2>
              <div className="d-flex justify-content-between small py-1">
                <span>
                  <span className="d-inline-block rounded-circle bg-success me-2" style={{ width: 8, height: 8 }} />
                  Active
                </span>
                <span>{counts.active}</span>
              </div>
              <div className="d-flex justify-content-between small py-1">
                <span>
                  <span className="d-inline-block rounded-circle bg-secondary me-2" style={{ width: 8, height: 8 }} />
                  Inactive
                </span>
                <span>{counts.inactive}</span>
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Recent Registrations</h2>
              {recentRegistrations.length === 0 && <div className="text-center text-muted small py-3">No users yet.</div>}
              <div className="d-flex flex-column gap-3">
                {recentRegistrations.map((user) => (
                  <div key={user.id} className="d-flex align-items-center gap-2">
                    <OrgAvatar name={user.fullName} size={32} />
                    <div className="flex-grow-1 overflow-hidden">
                      <div className="fw-medium text-truncate small">{user.fullName}</div>
                      <div className="text-muted text-truncate" style={{ fontSize: 12 }}>
                        {user.email}
                      </div>
                    </div>
                    <div className="text-muted text-nowrap" style={{ fontSize: 11 }}>
                      {new Date(user.createdAtUtc).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </PlatformLayout>
  );
}

import { useMemo, useState } from 'react';
import { Badge, Card, Form, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import DeactivateTenantButton from '../../components/DeactivateTenantButton';
import ReactivateTenantButton from '../../components/ReactivateTenantButton';
import OrgAvatar from '../../components/OrgAvatar';
import { useTenants } from '../../hooks/useTenants';
import { listPlans } from '../../api/plansApi';
import { listAllUsers } from '../../api/userApi';
import { listExams } from '../../api/examApi';

interface ManageTenantsProps {
  // Undefined = "All Organizations". PlatformSidebar's nav key for
  // highlighting derives from this page being mounted at one of three
  // routes (org-all/active/suspended) - see AppRoutes.tsx. Create and
  // per-org Details are their own dedicated pages (CreateOrganization.tsx,
  // OrganizationDetails.tsx), not modals/panels on this list anymore.
  statusFilter?: 'active' | 'suspended';
}

export default function ManageTenants({ statusFilter }: ManageTenantsProps) {
  const { data: tenants, isLoading, isError } = useTenants();

  const [searchText, setSearchText] = useState('');

  // Same real, already-SuperAdmin-accessible cross-tenant queries
  // OrganizationDetails.tsx/AllUsers.tsx/ExamUsageReport.tsx already use -
  // same query keys so React Query dedupes the cache across pages instead
  // of re-fetching.
  const { data: plans, isLoading: isLoadingPlans } = useQuery({ queryKey: ['plans'], queryFn: listPlans });
  const { data: allUsers, isLoading: isLoadingUsers } = useQuery({ queryKey: ['platform-users'], queryFn: listAllUsers });
  const { data: allExams, isLoading: isLoadingExams } = useQuery({ queryKey: ['platform-exams'], queryFn: listExams });

  const planNameById = useMemo(() => {
    const map = new Map<string, string>();
    (plans ?? []).forEach((p) => map.set(p.id, p.name));
    return map;
  }, [plans]);

  const adminsByTenantId = useMemo(() => {
    const map = new Map<string, string[]>();
    (allUsers ?? [])
      .filter((u) => u.role === 'Admin')
      .forEach((u) => {
        const existing = map.get(u.tenantId) ?? [];
        existing.push(u.email);
        map.set(u.tenantId, existing);
      });
    return map;
  }, [allUsers]);

  const userCountByTenantId = useMemo(() => {
    const map = new Map<string, number>();
    (allUsers ?? []).forEach((u) => map.set(u.tenantId, (map.get(u.tenantId) ?? 0) + 1));
    return map;
  }, [allUsers]);

  const examCountByTenantId = useMemo(() => {
    const map = new Map<string, number>();
    (allExams ?? []).forEach((e) => map.set(e.tenantId, (map.get(e.tenantId) ?? 0) + 1));
    return map;
  }, [allExams]);

  const statusFiltered = tenants?.filter((tenant) => {
    if (statusFilter === 'active') return tenant.isActive;
    if (statusFilter === 'suspended') return !tenant.isActive;
    return true;
  });

  const searchQuery = searchText.trim().toLowerCase();
  const filteredTenants = statusFiltered?.filter(
    (tenant) => !searchQuery || tenant.name.toLowerCase().includes(searchQuery) || tenant.slug.toLowerCase().includes(searchQuery),
  );

  const totalCount = tenants?.length ?? 0;
  const activeCount = tenants?.filter((t) => t.isActive).length ?? 0;
  const suspendedCount = totalCount - activeCount;

  const activeNavKey = statusFilter === 'active' ? 'org-active' : statusFilter === 'suspended' ? 'org-suspended' : 'org-all';
  const pageTitle =
    statusFilter === 'active' ? 'Active Organizations' : statusFilter === 'suspended' ? 'Suspended Organizations' : 'Organizations';

  const tabs: Array<{ label: string; count: number; path: string; filter?: 'active' | 'suspended' }> = [
    { label: 'All', count: totalCount, path: '/platform/organizations' },
    { label: 'Active', count: activeCount, path: '/platform/organizations/active', filter: 'active' },
    { label: 'Suspended', count: suspendedCount, path: '/platform/organizations/suspended', filter: 'suspended' },
  ];

  return (
    <PlatformLayout active={activeNavKey}>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Organizations</p>
          <h1 className="h4 fw-bold mb-1 text-primary">{pageTitle}</h1>
          <p className="text-muted mb-0">
            Organizations using ExamVault - manual provisioning path (Super Admin only).
          </p>
        </div>
        <div className="d-flex gap-2 align-items-start">
          <Form.Control
            type="search"
            placeholder="Search organizations..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 240 }}
          />
          <Link to="/platform/organizations/create" className="btn btn-primary text-nowrap">
            + Create Organization
          </Link>
        </div>
      </div>

      <div className="d-flex gap-2 mb-3">
        {tabs.map((tab) => {
          const isActiveTab = (tab.filter ?? undefined) === statusFilter;
          return (
            <Link key={tab.label} to={tab.path} className={`btn btn-sm ${isActiveTab ? 'btn-primary' : 'btn-outline-secondary'}`}>
              {tab.label} ({tab.count})
            </Link>
          );
        })}
      </div>

      <Card className="border-0 shadow-sm mb-3">
        <Card.Body className={isLoading || isError || filteredTenants?.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load organizations. Please try again.</div>}

          {!isLoading && !isError && filteredTenants?.length === 0 && (
            <div className="text-center text-muted py-5">
              {searchQuery
                ? 'No organizations match your search.'
                : statusFilter
                  ? `No ${statusFilter} organizations.`
                  : 'No organizations yet. Click "+ Create Organization" to add one.'}
            </div>
          )}

          {!isLoading && !isError && filteredTenants && filteredTenants.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Organization</th>
                  <th>Admin Contact</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Users</th>
                  <th>Exams</th>
                  <th>Created On</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center gap-2">
                        <OrgAvatar name={tenant.name} size={32} />
                        <div>
                          <div className="fw-medium">{tenant.name}</div>
                          <div className="text-muted" style={{ fontSize: 12 }}>
                            {tenant.slug}.examvaults.in
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">
                      {isLoadingUsers ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        (() => {
                          const admins = adminsByTenantId.get(tenant.id) ?? [];
                          if (admins.length === 0) return '—';
                          return admins.length > 1 ? `${admins[0]} (+${admins.length - 1} more)` : admins[0];
                        })()
                      )}
                    </td>
                    <td className="text-muted">
                      {isLoadingPlans ? <Spinner animation="border" size="sm" /> : (planNameById.get(tenant.planId) ?? '—')}
                    </td>
                    <td>
                      <Badge bg={tenant.isActive ? 'success' : 'secondary'}>
                        {tenant.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="text-muted">
                      {isLoadingUsers ? <Spinner animation="border" size="sm" /> : (userCountByTenantId.get(tenant.id) ?? 0)}
                    </td>
                    <td className="text-muted">
                      {isLoadingExams ? <Spinner animation="border" size="sm" /> : (examCountByTenantId.get(tenant.id) ?? 0)}
                    </td>
                    <td>{new Date(tenant.createdAtUtc).toLocaleDateString()}</td>
                    <td className="pe-4">
                      <div className="d-flex gap-2">
                        <Link
                          to={`/platform/organizations/${tenant.id}`}
                          className="btn btn-outline-secondary btn-sm"
                          title="View details"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </Link>
                        {tenant.isActive ? (
                          <DeactivateTenantButton tenantId={tenant.id} tenantName={tenant.name} />
                        ) : (
                          <ReactivateTenantButton tenantId={tenant.id} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <div className="row g-3">
        <div className="col-md-4">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Active Organizations</div>
              <div className="h4 fw-bold mb-1">{activeCount}</div>
              <div className="text-muted small mb-2">
                {totalCount === 0 ? 0 : ((activeCount / totalCount) * 100).toFixed(1)}% of total
              </div>
              <Link to="/platform/organizations/active" className="small text-decoration-none">
                View all active &rarr;
              </Link>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-4">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Suspended Organizations</div>
              <div className="h4 fw-bold mb-1">{suspendedCount}</div>
              <div className="text-muted small mb-2">
                {totalCount === 0 ? 0 : ((suspendedCount / totalCount) * 100).toFixed(1)}% of total
              </div>
              <Link to="/platform/organizations/suspended" className="small text-decoration-none">
                View all suspended &rarr;
              </Link>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-4">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Total Organizations</div>
              <div className="h4 fw-bold mb-1">{totalCount}</div>
              <div className="text-muted small mb-2">100% of total</div>
              <Link to="/platform/organizations" className="small text-decoration-none">
                View all &rarr;
              </Link>
            </Card.Body>
          </Card>
        </div>
      </div>
    </PlatformLayout>
  );
}

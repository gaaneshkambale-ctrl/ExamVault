import { useMemo } from 'react';
import { Badge, Card, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import OrgAvatar from '../../components/OrgAvatar';
import { useTenants } from '../../hooks/useTenants';
import { listPlans } from '../../api/plansApi';
import { listAllUsers } from '../../api/userApi';
import { listExams } from '../../api/examApi';

// Matches subscription.png's Organizations & Plans screen. Organization/
// Subdomain/Status/Created On/Plan/Students/Exams are real; Billing/Amount
// stay honest "-" placeholders - there is no billing/subscription-cycle
// model anywhere in this codebase (no price or renewal cadence on Plan, no
// billing-date field on Tenant), already called out as out of scope in
// multi_tenant_saas.txt. Status intentionally stays this app's real
// Active/Inactive, not the mockup's invented Trial/Suspended/Expired (no
// such tenant state exists).
export default function OrganizationsAndPlans() {
  const { data: tenants, isLoading, isError } = useTenants();

  // Same real, already-SuperAdmin-accessible cross-tenant queries
  // ManageTenants.tsx/OrganizationDetails.tsx/ExamUsageReport.tsx already
  // use - same query keys so React Query dedupes the cache across pages.
  const { data: plans, isLoading: isLoadingPlans } = useQuery({ queryKey: ['plans'], queryFn: listPlans });
  const { data: allUsers, isLoading: isLoadingUsers } = useQuery({ queryKey: ['platform-users'], queryFn: listAllUsers });
  const { data: allExams, isLoading: isLoadingExams } = useQuery({ queryKey: ['platform-exams'], queryFn: listExams });

  const planNameById = useMemo(() => {
    const map = new Map<string, string>();
    (plans ?? []).forEach((p) => map.set(p.id, p.name));
    return map;
  }, [plans]);

  const studentCountByTenantId = useMemo(() => {
    const map = new Map<string, number>();
    (allUsers ?? [])
      .filter((u) => u.role === 'Student')
      .forEach((u) => map.set(u.tenantId, (map.get(u.tenantId) ?? 0) + 1));
    return map;
  }, [allUsers]);

  const examCountByTenantId = useMemo(() => {
    const map = new Map<string, number>();
    (allExams ?? []).forEach((e) => map.set(e.tenantId, (map.get(e.tenantId) ?? 0) + 1));
    return map;
  }, [allExams]);

  return (
    <PlatformLayout active="subs-orgs">
      <p className="text-muted small mb-1">Platform Admin / Subscriptions / Organizations & Plans</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Organizations & Plans</h1>
      <p className="text-muted mb-3">View plan subscriptions for all organizations.</p>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || tenants?.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load organizations. Please try again.</div>}

          {!isLoading && !isError && tenants?.length === 0 && (
            <div className="text-center text-muted py-5">No organizations yet.</div>
          )}

          {!isLoading && !isError && tenants && tenants.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Organization</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Students</th>
                  <th>Exams</th>
                  <th>Start Date</th>
                  <th>Next Billing</th>
                  <th className="pe-4">Amount</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
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
                      {isLoadingPlans ? <Spinner animation="border" size="sm" /> : (planNameById.get(tenant.planId) ?? '—')}
                    </td>
                    <td>
                      <Badge bg={tenant.isActive ? 'success' : 'secondary'}>{tenant.isActive ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="text-muted">
                      {isLoadingUsers ? <Spinner animation="border" size="sm" /> : (studentCountByTenantId.get(tenant.id) ?? 0)}
                    </td>
                    <td className="text-muted">
                      {isLoadingExams ? <Spinner animation="border" size="sm" /> : (examCountByTenantId.get(tenant.id) ?? 0)}
                    </td>
                    <td>{new Date(tenant.createdAtUtc).toLocaleDateString()}</td>
                    <td className="text-muted">&mdash;</td>
                    <td className="pe-4 text-muted">&mdash;</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </PlatformLayout>
  );
}

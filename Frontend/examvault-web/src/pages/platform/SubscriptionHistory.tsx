import { useMemo, useState } from 'react';
import { Badge, Card, Form, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { useTenants } from '../../hooks/useTenants';
import { getAuditLogs } from '../../api/auditApi';

// Real, same data source as Security Events (same query key, dedupes the
// fetch) - AssignPlanToTenantHandler now looks up the tenant's previous
// plan name before overwriting it, and TenantsController.AssignPlan writes
// a Security/"Plan changed" audit entry (Details = "Old -> New") whenever
// the assigned plan actually changes. Re-assigning the same plan writes
// nothing - not a real history event.
const DEFAULT_FROM = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
const DEFAULT_TO = new Date().toISOString();

export default function SubscriptionHistory() {
  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ['platform-audit-logs', 'Security'],
    queryFn: () => getAuditLogs(DEFAULT_FROM, DEFAULT_TO, 'Security'),
  });
  const { data: tenants } = useTenants();

  const [searchText, setSearchText] = useState('');

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const planChanges = (logs ?? []).filter((log) => log.activity === 'Plan changed');

  const searchQuery = searchText.trim().toLowerCase();
  const filteredChanges = planChanges.filter((log) => {
    if (!searchQuery) return true;
    const orgName = tenantNameById.get(log.tenantId) ?? '';
    return (
      orgName.toLowerCase().includes(searchQuery) ||
      (log.details ?? '').toLowerCase().includes(searchQuery) ||
      (log.userName ?? '').toLowerCase().includes(searchQuery)
    );
  });

  return (
    <PlatformLayout active="subs-history">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Subscriptions / Subscription History</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Subscription History</h1>
          <p className="text-muted mb-0">
            A record of plan changes across organizations - who changed it, from which plan, to which.
          </p>
        </div>
        <Form.Control
          type="search"
          placeholder="Search organization, plan, admin..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 280 }}
        />
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredChanges.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load subscription history. Please try again.</div>}

          {!isLoading && !isError && filteredChanges.length === 0 && (
            <div className="text-center text-muted py-5">No plan changes recorded yet.</div>
          )}

          {!isLoading && !isError && filteredChanges.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Time</th>
                  <th>Organization</th>
                  <th>Plan Change</th>
                  <th className="pe-4">Changed By</th>
                </tr>
              </thead>
              <tbody>
                {filteredChanges.map((log) => {
                  const [fromPlan, toPlan] = (log.details ?? '').split(' -> ');
                  return (
                    <tr key={log.id}>
                      <td className="ps-4 text-muted" style={{ fontSize: 13 }}>
                        {new Date(log.timestampUtc).toLocaleString()}
                      </td>
                      <td>{tenantNameById.get(log.tenantId) ?? '—'}</td>
                      <td>
                        {fromPlan && toPlan ? (
                          <>
                            <Badge bg="light" text="dark" className="border">{fromPlan}</Badge>
                            <span className="mx-2 text-muted">&rarr;</span>
                            <Badge bg="primary">{toPlan}</Badge>
                          </>
                        ) : (
                          <span className="text-muted">{log.details ?? '—'}</span>
                        )}
                      </td>
                      <td className="pe-4 text-muted">{log.userName ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </PlatformLayout>
  );
}
